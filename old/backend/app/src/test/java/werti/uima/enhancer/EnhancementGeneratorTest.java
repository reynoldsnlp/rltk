package werti.uima.enhancer;

import com.google.common.collect.ImmutableMap;
import com.google.common.collect.ImmutableSet;
import org.junit.Before;
import org.junit.Rule;
import org.junit.Test;
import org.mockito.junit.MockitoJUnit;
import org.mockito.junit.MockitoRule;
import werti.server.UimaTestService;
import werti.server.enhancement.Enhancement;
import werti.server.enhancement.SentenceEnhancement;
import werti.server.enhancement.ViewEnhancement;
import werti.uima.ConvenientCas;
import werti.uima.types.annot.SentenceAnnotation;
import werti.uima.types.annot.Token;

import java.util.Collection;
import java.util.Set;
import java.util.stream.Collectors;

import static org.hamcrest.MatcherAssert.assertThat;
import static org.hamcrest.Matchers.is;

/**
 * @author Aleksandar Dimitrov
 * @since 2016-12-14
 */
public class EnhancementGeneratorTest {
    @Rule public MockitoRule rule = MockitoJUnit.rule();
    private ConvenientCas realCas;

    @Before
    public void setUp() throws Exception {
        UimaTestService uimaService = new UimaTestService();
        realCas = uimaService.provideCas();
        realCas.setDocumentText("abc");
    }

    @Test
    public void correctlyAddsSentenceTags() throws Exception {
        final SentenceAnnotation fakeSentenceAnnotation =
                realCas.createAnnotation(0, 1, SentenceAnnotation.class);
        final SentenceAnnotation realSentenceAnnotation =
                realCas.createAnnotation(1, 3, SentenceAnnotation.class);
        fakeSentenceAnnotation.setIsBasedOnBlock(true);

        final Set<Enhancement> expectedEnhancements = ImmutableSet.of(
                stripOriginalText(
                        new SentenceEnhancement(fakeSentenceAnnotation)
                        .addAttribute("isBasedOnBlock", "true")
                ),
                stripOriginalText(
                        new SentenceEnhancement(realSentenceAnnotation)
                )
        );

        final Set<Enhancement> enhancements =
                generateEnhancements(new SentenceEnhancementsGenerator(), realCas);

        assertThat(
                "The SentenceEnhancement should be generated from the SentenceAnnotation.",
                enhancements,
                is(expectedEnhancements)
        );
    }

    @Test
    public void selectsCorrectTypesWhenConfigured() throws Exception {
        final Set<Enhancement> expectedEnhancements = ImmutableSet.of(
                new ViewEnhancement(0, 1).addAttribute("type", "hit").addToCas(realCas),
                new ViewEnhancement(1, 2).addAttribute("type", "clue").addToCas(realCas)
        );
        new ViewEnhancement(2, 3).addAttribute("type", "ambiguity").addToCas(realCas);

        final Set<Enhancement> enhancements = generateEnhancements(
                new Enhancements(ImmutableMap.of("type", "hit clue")),
                realCas
        );

        assertThat(
                "Only hit and clue types should be selected",
                enhancements,
                is(expectedEnhancements)
        );
    }

    /**
     * See <a href="https://git.aleks.bg/view/view/issues/208">#208</a>.
     * @throws Exception Let's hope it doesn't.
     */
    @Test
    public void enhancementsAndTokensAddsOriginalTextOnTypeMiss() throws Exception {
        realCas.createAnnotation(0, 1, Token.class);
        final Set<Enhancement> expectedEnhancements = ImmutableSet.of(
                new ViewEnhancement(0, 1).addAttribute("type", "miss")
                                         .addAttribute("original-text", "a")
        );

        final Set<Enhancement> enhancements = ImmutableSet.copyOf(
                new EnhancementsAndTokens(ImmutableMap.of()).enhance(realCas)
        );

        assertThat(
                "There should be one miss with text 'a'",
                enhancements,
                is(expectedEnhancements)
        );
    }

    @Test
    public void enhancementsAndTokensWorkCorrectly() throws Exception {
        realCas.createAnnotation(0, 1, Token.class);
        realCas.createAnnotation(1, 2, Token.class);
        realCas.createAnnotation(2, 3, Token.class);
        new ViewEnhancement(1, 2).addAttribute("type", "hit").addToCas(realCas);

        final Set<Enhancement> enhancements = generateEnhancements(
                new EnhancementsAndTokens(ImmutableMap.of()),
                realCas
        );

        final Set<Enhancement> expectedEnhancement =
                ImmutableSet.of(
                        new ViewEnhancement(0, 1).addAttribute("type", "miss"),
                        new ViewEnhancement(1, 2).addAttribute("type", "hit"),
                        new ViewEnhancement(2, 3).addAttribute("type", "miss")
                );

        assertThat(
                "There should be three enhancements, with one hit",
                enhancements,
                is(expectedEnhancement)
        );
    }

    private Set<Enhancement> generateEnhancements(
            EnhancementGenerator generator,
            ConvenientCas cas
    ) throws Exception {
        final Collection<Enhancement> enhancements = generator.enhance(cas);
        return enhancements.stream().map(this::stripOriginalText).collect(Collectors.toSet());
    }

    private Enhancement stripOriginalText(Enhancement original) {
        final Enhancement result = new ViewEnhancement(original.getSpan());
        original.getAllAttributes().stream().filter(
                attribute -> !attribute.key().equals("original-text")
        ).forEach(
                attribute -> result.addAttribute(attribute.key(), attribute.value())
        );
        return result;
    }

    @Test
    public void enhancementsWorkCorrectly() throws Exception {
        realCas.createAnnotation(0, 1, Token.class);
        final Set<Enhancement> expectedEnhancement = ImmutableSet.of(
                new ViewEnhancement(1, 2).addToCas(realCas)
        );

        final Set<Enhancement> enhancements = generateEnhancements(
                new Enhancements(ImmutableMap.of()), realCas
        );

        assertThat(
                "There should be exactly one enhancement",
                enhancements,
                is(expectedEnhancement)
        );
    }

    @Test
    public void onlyHitsEnhancementsWork() throws Exception {
        final Set<Enhancement> expectedEnhancement = ImmutableSet.of(
                new ViewEnhancement(1, 2).addAttribute("type", "hit").addToCas(realCas)
        );
        new ViewEnhancement(0, 1).addAttribute("type", "ambiguity").addToCas(realCas);

        final Set<Enhancement> enhancements = generateEnhancements(
                new Enhancements(ImmutableMap.of("type", "hit")),
                realCas
        );

        assertThat(
                "There should be exactly one enhancement",
                enhancements,
                is(expectedEnhancement)
        );
    }
}
