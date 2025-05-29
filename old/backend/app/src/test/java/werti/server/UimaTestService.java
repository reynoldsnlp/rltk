package werti.server;

import org.apache.http.impl.client.HttpClients;
import org.apache.uima.UIMAException;
import org.apache.uima.analysis_component.JCasAnnotator_ImplBase;
import org.apache.uima.analysis_engine.AnalysisEngineDescription;
import org.apache.uima.fit.factory.AnalysisEngineFactory;
import org.apache.uima.fit.factory.JCasFactory;
import org.apache.uima.jcas.JCas;
import org.apache.uima.resource.ResourceInitializationException;
import org.jsoup.nodes.Document;
import werti.Language;
import werti.ViewContext;
import werti.ViewContextException;
import werti.server.analysis.CasPopulator;
import werti.server.analysis.DocumentAnalysisException;
import werti.server.analysis.FileBackedUimaService;
import werti.server.analysis.UimaService;
import werti.server.interaction.feedback.FeedbackUtils;
import werti.server.modules.ViewGson;
import werti.uima.ConvenientCas;
import werti.uima.ae.util.SpacyApi;
import werti.uima.types.annot.BlockText;

/**
 * @author Aleksandar Dimitrov
 * @since 2017-01-09
 */
public class UimaTestService implements UimaService {
    private final UimaService uimaService;
    private final ViewContext viewContext;
    private final FeedbackUtils feedbackUtils;

    public UimaTestService() throws ViewContextException {
        viewContext = ViewTestContext.createTestContext();
        uimaService = new FileBackedUimaService(
                new TestResourceFactory(viewContext),
                viewContext,
                new SpacyApi(viewContext, new ViewGson().getGson(), HttpClients.createDefault())
        );
        feedbackUtils = new FeedbackUtils();
    }

    public ViewContext getViewContext() {
        return viewContext;
    }

    public ConvenientCas analyseHtml(
            Document html,
            AnalysisEngineDescription engine,
            Language language
    ) throws DocumentAnalysisException {
        final ConvenientCas cas;
        try {
            cas = provideCas(language);
        } catch (UIMAException e) {
            throw new DocumentAnalysisException(e);
        }
        new CasPopulator().populateCas(html, cas);
        runPipeline(cas, engine);
        return cas;
    }

    public ConvenientCas analyseText(
            String text,
            AnalysisEngineDescription engine,
            Language language
    ) throws DocumentAnalysisException {
        final ConvenientCas cas;
        try {
            cas = provideCas(language);
        } catch (UIMAException e) {
            throw new DocumentAnalysisException(e);
        }
        cas.setDocumentText(text);
        cas.createAnnotation(0, text.length(), BlockText.class);
        uimaService.runPipeline(cas, engine);
        return cas;
    }

    public ConvenientCas analyseTextWithFeedback(
            String correctAnswerSentenceWithTags,
            String submission,
            AnalysisEngineDescription engine,
            Language language
    ) throws DocumentAnalysisException {
        final ConvenientCas cas;
        try {
            cas = provideCas();
        } catch (UIMAException e) {
            throw new DocumentAnalysisException(e);
        }
        feedbackUtils.prepareCas(cas, correctAnswerSentenceWithTags, submission, language);
        uimaService.runPipeline(cas, engine);
        return cas;
    }

    public void runPipeline(ConvenientCas cas, AnalysisEngineDescription analysisEngine)
            throws DocumentAnalysisException {
        uimaService.runPipeline(cas, analysisEngine);
    }

    public void runPipeline(ConvenientCas cas, Class<? extends JCasAnnotator_ImplBase> engineClass)
            throws DocumentAnalysisException {
        try {
            uimaService.runPipeline(
                    cas,
                    AnalysisEngineFactory.createEngineDescription(engineClass)
            );
        } catch (ResourceInitializationException e) {
            throw new DocumentAnalysisException(e);
        }
    }

    public ConvenientCas provideCas() throws UIMAException {
        final JCas cas = JCasFactory.createJCas();
        return new ConvenientCas(cas);
    }

    public ConvenientCas provideCas(Language language) throws UIMAException {
        final ConvenientCas cas = provideCas();
        cas.setDocumentLanguage(language);
        return cas;
    }
}
