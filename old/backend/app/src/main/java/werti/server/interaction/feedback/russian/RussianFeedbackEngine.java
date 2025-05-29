package werti.server.interaction.feedback.russian;

import com.google.inject.Provider;
import org.apache.uima.analysis_engine.AnalysisEngineDescription;
import org.apache.uima.resource.ResourceInitializationException;
import werti.Language;
import werti.server.analysis.DocumentAnalysisException;
import werti.server.analysis.UimaService;
import werti.server.analysis.ViewRequestException;
import werti.server.interaction.data.Feedback;
import werti.server.interaction.data.Task;
import werti.server.interaction.feedback.FeedbackEngine;
import werti.server.interaction.feedback.FeedbackUtils;
import werti.server.interaction.transfer.TrackingRequestData;
import werti.uima.ConvenientCas;
import werti.uima.ae.OpenNlpTokenizer;
import werti.uima.ae.RusStressAnnotator;
import werti.uima.ae.HFSTAnnotator;
import werti.uima.ae.HFSTMalAnnotator;

import javax.inject.Inject;
import javax.inject.Named;

import static org.apache.uima.fit.factory.AnalysisEngineFactory.createEngineDescription;

/**
 * @author Aleksandar Dimitrov
 * @since 2017-04-22
 */
public class RussianFeedbackEngine implements FeedbackEngine {
    private final UimaService uimaService;
    private final Provider<ConvenientCas> casProvider;
    private final FeedbackUtils feedbackUtils;
    private final RusDiagnosisManager rusDiagnosisManager;

    @Inject
    public RussianFeedbackEngine(
            final UimaService uimaService,
            final @Named("fresh-cas") Provider<ConvenientCas> casProvider,
            final FeedbackUtils feedbackUtils,
            final RusDiagnosisManager rusDiagnosisManager
    ) {
        this.uimaService = uimaService;
        this.casProvider = casProvider;
        this.feedbackUtils = feedbackUtils;
        this.rusDiagnosisManager = rusDiagnosisManager;
    }

    @Override
    public Feedback getFeedbackFor(
            Task task,
            TrackingRequestData requestData
    ) throws ViewRequestException {
        ConvenientCas cas = analyse(
                task.activity().activity(),
                requestData.sentence(),
                requestData.submission()
        );
        return rusDiagnosisManager.getBestFeedback(cas, task);
    }

    private ConvenientCas analyse(
            final String activityName,
            final String correctAnswerSentenceWithTags,
            final String submission
    ) throws ViewRequestException {
        try {
            final AnalysisEngineDescription engine = getEngine(activityName);
            final ConvenientCas cas = casProvider.get();
            feedbackUtils.prepareCas(
                    cas,
                    correctAnswerSentenceWithTags,
                    submission,
                    Language.RUSSIAN
            );
            uimaService.runPipeline(cas, engine);
            return cas;
        } catch (ResourceInitializationException | DocumentAnalysisException e) {
            throw new ViewRequestException(e);
        }
    }

    private AnalysisEngineDescription getEngine(final String activityName) throws ResourceInitializationException {
        if("cloze".equals(activityName)){
            return createEngineDescription(
                    createEngineDescription(OpenNlpTokenizer.class),
                    createEngineDescription(
                            HFSTMalAnnotator.class,
                            "isWithTrace",
                            Boolean.FALSE,
                            "language",
                            Language.RUSSIAN
                    ),
                    createEngineDescription(RusStressAnnotator.class)
            );
        }
        return createEngineDescription(
                createEngineDescription(OpenNlpTokenizer.class),
                createEngineDescription(
                        HFSTAnnotator.class,
                        "isWithTrace",
                        Boolean.FALSE,
                        "language",
                        Language.RUSSIAN
                )
        );
    }
}
