package werti.uima.enhancer;

import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
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
 * @since 2017-12-15
 */
public class OpenNlpEnhancer extends JCasAnnotator_ImplBase {
    private static final Logger log = LogManager.getLogger();

    @Override
    public void process(JCas jCas) throws AnalysisEngineProcessException {
        log.debug("Starting enhancement");

        final ConvenientCas cas = new ConvenientCas(jCas);
        cas.select(Token.class).stream()
           .filter(token -> !EnhancerUtils.isPunctuation(token))
           .forEach(token -> {
               final ViewEnhancement dummyEnhancement = new ViewEnhancement(0, 0);
               dummyEnhancement.addAttribute("morph-pos", token.getTag());
               dummyEnhancement.addAttribute("morph-lemma", token.getLemma());
               final String data = dummyEnhancement.getData();
               cas.createAnnotation(token, EnhancementAnnotation.class).setData(data);
           });

        log.debug("Finished enhancement");
    }
}
