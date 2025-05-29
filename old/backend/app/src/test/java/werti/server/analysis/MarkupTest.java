package werti.server.analysis;

import com.google.common.collect.ImmutableMap;
import com.google.inject.util.Providers;
import org.apache.uima.UIMAException;
import org.apache.uima.analysis_engine.AnalysisEngineDescription;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.junit.Before;
import org.junit.Rule;
import org.junit.Test;
import org.trimou.util.ImmutableList;
import werti.Language;
import werti.ViewContextException;
import werti.server.UimaTestService;
import werti.server.data.*;
import werti.server.enhancement.CasEnhancer;
import werti.server.servlet.ViewRequest;
import werti.server.support.FileResource;
import werti.uima.ae.OpenNlpSentenceDetector;
import werti.uima.ae.OpenNlpTokenizer;
import werti.uima.enhancer.SentenceEnhancementsGenerator;

import java.net.URL;
import java.util.Optional;

import static org.apache.uima.fit.factory.AnalysisEngineFactory.createEngineDescription;
import static org.hamcrest.Matchers.is;
import static org.junit.Assert.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/**
 * A general test class that takes html, runs a VIEW enhancement pipeline, and asserts that the
 * file was correctly enhanced, without destroying any markup in unexpected ways.
 *
 * @author Aleksandar Dimitrov
 * @since 2017-04-24
 */
public class MarkupTest {
    @Rule public FileResource wikipediaTOC = new FileResource("markup/wikipediaTOC.html");
    @Rule public FileResource wikipediaCitationNeeded =
            new FileResource("markup/wikipediaCitationNeeded.html");
    @Rule public FileResource wikipediaReferences =
            new FileResource("markup/wikipediaReferences.html");

    private UimaDocumentProcessor processor;
    private AnalysisEngineDescription basicOpenNlp;

    @Before
    public void setUp() throws ViewContextException, UIMAException {
        final UimaTestService uimaService = new UimaTestService();

        final HtmlDocumentAnalyser analyser = new HtmlDocumentAnalyser(
                uimaService,
                Providers.of(new CasPopulator()),
                Providers.of(uimaService.provideCas(Language.ENGLISH))
        );

        processor = new UimaDocumentProcessor(
                analyser,
                Providers.of(new CasEnhancer()),
                new SentenceEnhancementsGenerator()
        );

        basicOpenNlp = createEngineDescription(
                        createEngineDescription(OpenNlpTokenizer.class),
                        createEngineDescription(OpenNlpSentenceDetector.class)
        );
    }

    @Test
    public void wikipediaReferencesSectionDoseNotNestSentences() throws Exception {
        final Document result = runPipeline(
                Language.ENGLISH,
                basicOpenNlp,
                wikipediaReferences.slurp()
        );

        assertThat(
                "There should be no nested sentences",
                result.select("sentence sentence").size(),
                is(0)
        );
    }

    @Test
    public void wikipediaCitationNeededLinksDontCauseWrongSentenceMarkup() throws Exception {
        final Document result = runPipeline(
                Language.ENGLISH,
                basicOpenNlp,
                wikipediaCitationNeeded.slurp()
        );

        assertThat(
                "There should be no nested sentences",
                result.select("sentence sentence").size(),
                is(0)
        );
    }

    @Test
    public void wikipediaTableOfContentsDoesNotNestSentences() throws Exception {
        final Document result = runPipeline(
                Language.ENGLISH,
                basicOpenNlp,
                wikipediaTOC.slurp()
        );

        assertThat(
                "There should be no nested sentences",
                result.select("sentence sentence").size(),
                is(0)
        );
    }

    private Document runPipeline(
            Language language,
            AnalysisEngineDescription descriptor,
            String html
    ) throws Exception {
        final Document input = Jsoup.parse(html);
        final ViewRequest request = createRequest(language, descriptor, input);
        return processor.process(request);
    }

    private ViewRequest createRequest(
            Language language,
            AnalysisEngineDescription descriptor,
            Document document
    ) throws Exception {
        final Activity activity = Activity
                .builder()
                .activity("testActivity")
                .description(new StringDescription("test", "4 5 6"))
                .enhancementDescription(EnhancerSettings.create(
                        "werti.uima.enhancer.Enhancements",
                        ImmutableMap.of())
                ).build();

        final Pipeline pipeline = mock(Pipeline.class);
        when(pipeline.assemble()).thenReturn(descriptor);

        final Topic topic = mock(Topic.class);
        when(topic.topic()).thenReturn("testTopic");
        when(topic.getPipelineFor(language)).thenReturn(Optional.of(pipeline));
        when(topic.activities()).thenReturn(ImmutableList.of(activity));
        when(topic.selectActivity(activity.activity())).thenReturn(Optional.of(activity));

        return ViewRequest.create(
                language,
                topic,
                activity,
                document,
                new URL("http://example.com")
        );
    }
}
