package werti.uima.enhancer;

import com.google.common.collect.ImmutableMap;
import org.apache.uima.analysis_engine.AnalysisEngineDescription;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.junit.Test;
import werti.Language;
import werti.server.UimaTestService;
import werti.server.enhancement.Enhancement;
import werti.server.enhancement.ViewEnhancement;
import werti.uima.ConvenientCas;
import werti.uima.fit.RfTaggerGermanPipeline;
import werti.uima.types.EnhancementAnnotation;

import java.util.Collection;
import java.util.Optional;
import java.util.stream.Collectors;

import static org.hamcrest.Matchers.contains;
import static org.junit.Assert.assertThat;

/**
 * @author Aleksandar Dimitrov
 * @since 2017-06-04
 */
public class DkProEnhancerTest {
    @Test
    public void works() throws Exception {
        final AnalysisEngineDescription pipeline = new RfTaggerGermanPipeline().produce(ImmutableMap.of(
                "enhancePos", "PRO;ART"
        ));
        final UimaTestService uimaService = new UimaTestService();
        final Document input = Jsoup.parse("<p>Dies ist ein Test.</p>");

        final ConvenientCas cas = uimaService.analyseHtml(input, pipeline, Language.GERMAN);

        final Collection<Enhancement> enhancements = cas.select(EnhancementAnnotation.class)
                                                        .stream()
                                                        .map(ViewEnhancement::new)
                                                        .collect(Collectors.toList());

        assertThat(
                "Enhancements should be on all tokens, but not on punctuation",
                enhancements.stream()
                            .map(e -> e.getAttribute("original-text").orElse("undefined"))
                            .collect(Collectors.toList()),
                contains("Dies", "ist", "ein", "Test")
        );

        assertThat(
                "The morphological analysis should contain correct number",
                enhancements.stream()
                            .map(e -> e.getAttribute("morph-number"))
                            .collect(Collectors.toList()),
                contains(Optional.of("Sing"), Optional.of("Sing"), Optional.of("Sing"), Optional.of("Sing"))
        );

    }
}
