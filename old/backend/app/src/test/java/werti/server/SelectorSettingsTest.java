package werti.server;

import org.apache.uima.jcas.tcas.Annotation;
import org.junit.Test;
import org.trimou.util.ImmutableList;
import org.trimou.util.ImmutableMap;
import werti.server.data.SelectorSettings;
import werti.uima.types.annot.CGToken;
import werti.uima.types.annot.SentenceAnnotation;
import werti.uima.types.annot.Token;

import java.util.HashMap;
import java.util.function.Predicate;

import static org.hamcrest.MatcherAssert.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/**
 * @author Aleksandar Dimitrov
 * @since 2016-11-24
 */
public class SelectorSettingsTest {
    @Test
    public void createsValidPredicates() throws Exception {
        final SelectorSettings description = SelectorSettings.create(
                "werti.uima.types.annot.Token",
                ImmutableMap.of("tag", ImmutableList.of("test", "best")),
                new HashMap<>(0)
        );

        final Token test = mock(Token.class);
        when(test.getTag()).thenReturn("test");

        final Token best = mock(Token.class);
        when(best.getTag()).thenReturn("best");

        final Token rest = mock(Token.class);
        when(rest.getTag()).thenReturn("rest");

        final Predicate<Annotation> selector = description.toPredicate();

        assertThat("First tag should pass", selector.test(test));
        assertThat("Second tag should pass", selector.test(best));
        assertThat("Third tag should not pass", selector.negate().test(rest));
    }

    @Test
    public void regularExpressionsWork() throws Exception {
        final Predicate<Annotation> selector = SelectorSettings.create(
                "werti.uima.types.annot.Token",
                ImmutableMap.of("tag", ImmutableList.of("dt[isx]?")),
                new HashMap<>(0)
        ).toPredicate();

        final Token dt = mock(Token.class);
        when(dt.getTag()).thenReturn("dt");
        final Token dtx = mock(Token.class);
        when(dtx.getTag()).thenReturn("dtx");
        final Token noMatch = mock(Token.class);
        when(noMatch.getTag()).thenReturn("noMatch");

        assertThat("dt[isx]? should match dt", selector.test(dt));
        assertThat("dt[isx]? should match dtx", selector.test(dtx));
        assertThat("dt[isx]? should not match noMatch", selector.negate().test(noMatch));
    }

    @Test
    public void russianReadingsRegularExpressions() throws Exception {
        final Predicate<Annotation> selector = SelectorSettings.create(
                "werti.uima.types.annot.CGToken",
                ImmutableMap.of("firstReading", ImmutableList.of("")),
                ImmutableMap.of("allReadings", ImmutableList.of(""))
        ).toPredicate();

        final CGToken a = mock(CGToken.class);
        when(a.getFirstReading()).thenReturn("");
        when(a.getAllReadings()).thenReturn("");
    }

    @Test
    public void emptyPredicateAcceptsAll() throws Exception {
        final Predicate<Annotation> selector = SelectorSettings.create(
                "werti.uima.types.annot.Token",
                new HashMap<>(0),
                new HashMap<>(0)
        ).toPredicate();

        final Token token = mock(Token.class);
        final SentenceAnnotation sentence  = mock(SentenceAnnotation.class);

        assertThat(
                "Tokens should match, as they're the right type",
                selector.test(token)
        );
        assertThat(
                "Sentences should not match, as they're the wrong type",
                selector.negate().test(sentence)
        );
    }

    @Test
    public void exclusionPatternsWork() throws Exception {
        final Predicate<Annotation> selector = SelectorSettings.create(
                "werti.uima.types.annot.Token",
                new HashMap<>(0),
                ImmutableMap.of("tag", ImmutableList.of("foo", "bar"))
        ).toPredicate();

        final Token foobar = mock(Token.class);
        when(foobar.getTag()).thenReturn("foo");
        final Token barfoo = mock(Token.class);
        when(barfoo.getTag()).thenReturn("bar");

        final Token noMatch = mock(Token.class);
        when(noMatch.getTag()).thenReturn("noMatch");

        assertThat("foobar should match and be excluded", selector.negate().test(foobar));
        assertThat("barfoo should match and be excluded", selector.negate().test(barfoo));
        assertThat("noMatch should not match and be included", selector.test(noMatch));
    }

    @Test
    public void exclusionAndInclusionMesh() throws Exception {
        final Predicate<Annotation> selector = SelectorSettings.create(
                "werti.uima.types.annot.Token",
                ImmutableMap.of("tag", ImmutableList.of("foo")),
                ImmutableMap.of("tag", ImmutableList.of("bar"))
        ).toPredicate();

        final Token foobar = mock(Token.class);
        when(foobar.getTag()).thenReturn("foobar");
        final Token foo = mock(Token.class);
        when(foo.getTag()).thenReturn("foo");

        assertThat(
                "foobar should match inclusion and exclusion and be excluded",
                selector.negate().test(foobar)
        );
        assertThat(
                "foo should match only the exclusion pattern and be included",
                selector.test(foo)
        );
    }

    @Test
    public void conditionsAreConjunctive() throws Exception {
        final Predicate<Annotation> selector = SelectorSettings.create(
                "werti.uima.types.annot.Token",
                ImmutableMap.of(
                        "tag", ImmutableList.of("barf"),
                        "lemma", ImmutableList.of("narf")
                ),
                new HashMap<>(0)
        ).toPredicate();

        final Token token = mock(Token.class);
        when(token.getTag()).thenReturn("barf");

        assertThat("Token with one condition should not pass", selector.negate().test(token));

        when(token.getLemma()).thenReturn("narf");

        assertThat("Token with both conditions should pass", selector.test(token));
    }
}
