package werti.server;

import com.google.common.collect.ImmutableSet;
import org.junit.Test;
import werti.Language;
import werti.server.enhancement.Enhancement;
import werti.server.enhancement.EnhancementAttribute;
import werti.server.enhancement.Span;
import werti.server.enhancement.ViewEnhancement;
import werti.uima.ConvenientCas;
import werti.uima.types.EnhancementAnnotation;

import java.util.Optional;

import static org.hamcrest.MatcherAssert.assertThat;
import static org.hamcrest.Matchers.is;

/**
 * @author Aleksandar Dimitrov
 * @since 2016-12-09
 */
public class EnhancementTest {
    @Test
    public void addsAndRetrievesAttributesCorrectly() {
        final ViewEnhancement e = new ViewEnhancement(0, 0);
        e.addAttribute("foo", "bar");
        e.addAttribute("foo", "baz");

        assertThat(
                "Attributes should be correctly stored and retrieved.",
                e.getAttribute("foo"),
                is(Optional.of("bar baz"))
        );

        assertThat(
                "Non-existent attributes should just return Optional.empty",
                e.getAttribute("notthere"),
                is(Optional.empty())
        );

        assertThat(
                "All attributes should be returned correctly",
                e.getAllAttributes(),
                is(ImmutableSet.of(EnhancementAttribute.create("foo", "bar baz")))
        );
    }

    @Test
    public void stripsPunctuationFromOriginalText() throws Exception {
        final ConvenientCas cas = new UimaTestService().provideCas(Language.ENGLISH);
        cas.setDocumentText("„A“");
        final Enhancement e = new ViewEnhancement(0, 3);

        e.addToCas(cas);

        EnhancementAnnotation annotation = cas
                .select(EnhancementAnnotation.class)
                .iterator()
                .next();

        final ViewEnhancement view = new ViewEnhancement(annotation);
        assertThat(
                "original-text does not contain quotes",
                view,
                is(e.addAttribute("original-text", "A"))
        );
    }

    @Test
    public void serialisesAndDeserialisesToCas() throws Exception {
        final ConvenientCas cas = new UimaTestService().provideCas(Language.ENGLISH);
        cas.setDocumentText("foo");
        final Enhancement e1 = new ViewEnhancement(0, 3)
                .addAttribute("foo", "bar")
                .addAttribute("foo", "baz")
                .addAttribute("blubb", "blah");
        e1.addToCas(cas);
        EnhancementAnnotation annotation =
                cas.select(EnhancementAnnotation.class).iterator().next();
        final ViewEnhancement e2 = new ViewEnhancement(annotation);
        assertThat(
                "The resulting annotation should be the same as the original one",
                e2,
                is(e1.addAttribute("original-text", "foo"))
        );
    }

    @Test
    public void addsOriginalTextAutomaticallyWhenInstantiatedFromAnnotation() throws Exception {
        final ConvenientCas cas = new UimaTestService().provideCas(Language.ENGLISH);
        cas.setDocumentText("foo");
        cas.createAnnotation(0, 3, EnhancementAnnotation.class);
        final ViewEnhancement e =
                new ViewEnhancement(cas.select(EnhancementAnnotation.class).iterator().next());

        assertThat(
                "When creating an enhancement from an Annotation original text should be set automatically",
                e.getAttribute("original-text").orElse("no-match"),
                is("foo")
        );
    }

    @Test
    public void handlesSpansCorrectly() {
        final int begin = 0;
        final int end = 0;
        final ViewEnhancement e = new ViewEnhancement(begin, end);

        assertThat(
                "Enhancement span  should be correct",
                e.getSpan(),
                is(Span.create(begin, end))
        );
    }
}
