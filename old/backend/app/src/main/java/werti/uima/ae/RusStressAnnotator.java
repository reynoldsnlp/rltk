package werti.uima.ae;

import org.apache.uima.UimaContext;
import org.apache.uima.analysis_engine.AnalysisEngineProcessException;
import org.apache.uima.fit.component.JCasAnnotator_ImplBase;
import org.apache.uima.fit.descriptor.ExternalResource;
import org.apache.uima.jcas.JCas;
import org.apache.uima.resource.ResourceInitializationException;
import werti.Language;
import werti.resources.FileBackedResourceFactory;
import werti.resources.NoResourceException;
import werti.uima.ConvenientCas;
import werti.uima.types.annot.AnalysisResults;
import werti.uima.types.annot.CGToken;
import werti.uima.types.annot.CorrectAnswerAnnotation;
import werti.util.HFSTStressGenerator;

/**
 * @author Eduard Schaf
 * @since 24.04.17
 */
public class RusStressAnnotator extends JCasAnnotator_ImplBase {
    @ExternalResource
    protected FileBackedResourceFactory resourceFactory;

    protected HFSTStressGenerator hfstStressGenerator;

    @Override
    public void initialize(UimaContext uimaContext) throws ResourceInitializationException {
        super.initialize(uimaContext);

        try {
            hfstStressGenerator = new HFSTStressGenerator(resourceFactory, Language.RUSSIAN);
        } catch (NoResourceException e) {
            throw new ResourceInitializationException(e);
        }
    }

    @Override
    public void process(JCas aJCas) throws AnalysisEngineProcessException {
        final ConvenientCas cas = new ConvenientCas(aJCas);

        CorrectAnswerAnnotation correctAnswerAnnotation = cas.selectFirst(CorrectAnswerAnnotation.class);

        CGToken correctAnswer = cas.selectFirstCovered(CGToken.class, correctAnswerAnnotation);

        String answerWithStress = hfstStressGenerator
                .runTransducer(correctAnswer.getLemma() + correctAnswer.getFirstReading())
                .iterator()
                .next();

        cas.selectFirst(AnalysisResults.class).setAnswerWithStress(answerWithStress);
    }
}
