package werti.uima.enhancer;

import org.apache.uima.analysis_engine.AnalysisEngineProcessException;
import org.apache.uima.fit.component.JCasAnnotator_ImplBase;
import org.apache.uima.jcas.JCas;
import werti.server.enhancement.ViewEnhancement;
import werti.uima.ConvenientCas;
import werti.uima.types.EnhancementAnnotation;
import werti.uima.types.annot.Token;
import werti.util.EnhancerUtils;

/**
 * @author Aleksandar Dimitrov
 * @since 2018-02-10
 */
public class SpacyEnhancer extends JCasAnnotator_ImplBase {
    @Override
    public void process(JCas jCas) throws AnalysisEngineProcessException {
        final ConvenientCas cas = new ConvenientCas(jCas);

        cas.select(Token.class).stream()
           .filter(token -> !EnhancerUtils.isPunctuation(token))
           .forEach(token -> createEnhancement(token, cas));
    }

    private void createEnhancement(Token token, ConvenientCas cas) {
        final EnhancementAnnotation enhancement =
                cas.createAnnotation(token, EnhancementAnnotation.class);

        final ViewEnhancement dummy = new ViewEnhancement(token);
        dummy.addAttribute("pos", token.getTag());
        dummy.addAttribute("relation", token.getRelation());
        final Token head = token.getHead();
        if (head != null) {
            dummy.addAttribute("head", String.valueOf(head.getDepid()));
        }
        dummy.addAttribute("depId", String.valueOf(token.getDepid()));

        enhancement.setData(dummy.getData());
    }
}
