package werti.endtoend.topics;

import com.google.inject.util.Providers;
import org.apache.uima.analysis_engine.AnalysisEngineDescription;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import werti.Language;
import werti.server.UimaTestService;
import werti.server.analysis.CasPopulator;
import werti.server.analysis.DocumentProcessor;
import werti.server.analysis.HtmlDocumentAnalyser;
import werti.server.analysis.UimaDocumentProcessor;
import werti.server.data.*;
import werti.server.enhancement.CasEnhancer;
import werti.server.servlet.ViewRequest;
import werti.uima.ConvenientCas;
import werti.uima.enhancer.EnhancementGenerator;
import werti.uima.enhancer.SentenceEnhancementsGenerator;

import java.util.Optional;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/**
 * Utility class to build a {@link DocumentProcessor} and {@link ViewRequest}
 * from seed parameters in order to exercise the entire pipeline with certian
 * parameters, without involving servlet-specific code.
 *
 * @author Aleksandar Dimitrov
 * @since 2017-01-21
 */
public class ProcessorBuilder {
    private final ViewRequest request;
    private final Topics topics;

    ProcessorBuilder() throws Exception {
        request = mock(ViewRequest.class);
        topics = TestTopics.getRealTopics();
    }

    public ProcessorBuilder with(AnalysisEngineDescription engine) throws Exception {
        when(request.pipeline()).thenReturn(mock(Pipeline.class));
        when(request.pipeline().assemble()).thenReturn(engine);

        return this;
    }

    public ProcessorBuilder with(Language language) {
        when(request.language()).thenReturn(language);

        return this;
    }

    public ProcessorBuilder with(EnhancementGenerator generator) throws Exception {
        when(request.activity()).thenReturn(mock(Activity.class));
        when(request.activity().enhancementDescription()).thenReturn(mock(EnhancerSettings.class));
        when(request.activity().enhancementDescription().getEnhancementGenerator()).thenReturn(
                generator
        );

        return this;
    }


    public ActivitySelector with(String topicName, Language language) throws Exception {
        with(language);
        Optional<Topic> topicOption = topics.get(topicName, language);
        Optional<Pipeline> pipelineOption = topicOption.flatMap(topic -> topic.getPipelineFor(language));

        if (pipelineOption.isPresent()) {
            final Pipeline pipeline = pipelineOption.get();
            with(pipeline.assemble());
            return new ActivitySelector(this, topicOption.get());
        }

        throw new ViewConfigurationException("Couldn't find pipeline for " + topicName + ", " +
                "language " + language.toString());
    }

    public ProcessorBuilder with(Activity activity) throws Exception {
        return with(activity.enhancementDescription().getEnhancementGenerator());
    }

    public static class ActivitySelector {
        private final ProcessorBuilder builder;
        private final Topic topic;

        ActivitySelector(ProcessorBuilder builder, Topic topic) {
            this.builder = builder;
            this.topic = topic;
        }

        ProcessorBuilder select(String activityName) throws Exception {
            final Optional<Activity> activityOption = topic.selectActivity(activityName);
            if (activityOption.isPresent()) {
                return builder.with(activityOption.get());
            } else {
                throw new ViewConfigurationException("No activity " + activityName);
            }
        }
    }

    public Document process(final String text) throws Exception {
        return process(Jsoup.parse(text));
    }

    public Document process(final Document document) throws Exception {
        final UimaTestService uimaService = new UimaTestService();
        final ConvenientCas cas = uimaService.provideCas();
        final HtmlDocumentAnalyser analyser = new HtmlDocumentAnalyser(
                uimaService,
                Providers.of(new CasPopulator()),
                Providers.of(cas)
        );

        final DocumentProcessor processor = new UimaDocumentProcessor(
                analyser,
                Providers.of(new CasEnhancer()),
                new SentenceEnhancementsGenerator()
        );

        when(request.document()).thenReturn(document);

        return processor.process(request);
    }
}
