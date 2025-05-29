package werti.uima.enhancer;

import de.tudarmstadt.ukp.dkpro.core.api.lexmorph.type.morph.MorphologicalFeatures;
import de.tudarmstadt.ukp.dkpro.core.api.lexmorph.type.pos.POS;
import de.tudarmstadt.ukp.dkpro.core.api.segmentation.type.Lemma;
import de.tudarmstadt.ukp.dkpro.core.api.segmentation.type.Token;
import org.apache.uima.analysis_engine.AnalysisEngineProcessException;
import org.apache.uima.fit.component.JCasAnnotator_ImplBase;
import org.apache.uima.jcas.JCas;
import werti.server.enhancement.ViewEnhancement;
import werti.uima.ConvenientCas;
import werti.uima.types.EnhancementAnnotation;
import werti.util.EnhancerUtils;

/**
 * @author Aleksandar Dimitrov
 * @since 2017-06-04
 */
public class DkProEnhancer extends JCasAnnotator_ImplBase {
    @Override
    public void process(JCas aJCas) throws AnalysisEngineProcessException {
        final ConvenientCas cas = new ConvenientCas(aJCas);

        cas.select(Token.class).stream()
           .filter(token -> !EnhancerUtils.isPunctuation(token))
           .forEach(token -> createEnhancement(token, cas));
    }

    private void createEnhancement(
            Token token,
            ConvenientCas cas
    ) {
        final EnhancementAnnotation enhancement = cas.createAnnotation(token, EnhancementAnnotation.class);
        final ViewEnhancement dummy = new ViewEnhancement(token);

        final POS pos = token.getPos();
        if (pos != null) {
            dummy.addAttribute("pos", pos.getPosValue());
        }

        final Lemma lemma = token.getLemma();
        if (lemma != null) {
            dummy.addAttribute("pos", lemma.getValue());
        }

        final MorphologicalFeatures features = token.getMorph();
        if (features != null) {
            // Yay for verbose initialization due to shitty type systems -.- We could also use reflection, but what's the
            // point. Note that Enhancement#addAttribute will not actually add an attribute the value of which is null.
            dummy.addAttribute("morph-case", features.getCase());
            dummy.addAttribute("morph-gender", features.getGender());
            dummy.addAttribute("morph-number", features.getNumber());
            dummy.addAttribute("morph-person", features.getPerson());
            dummy.addAttribute("morph-degree", features.getDegree());
            dummy.addAttribute("morph-verbForm", features.getVerbForm());
            dummy.addAttribute("morph-tense", features.getTense());
            dummy.addAttribute("morph-mood", features.getMood());
            dummy.addAttribute("morph-voice", features.getVoice());
            dummy.addAttribute("morph-aspect", features.getAspect());
            dummy.addAttribute("morph-animacy", features.getAnimacy());
            dummy.addAttribute("morph-negative", features.getNegative());
            dummy.addAttribute("morph-numberType", features.getNumType());
            dummy.addAttribute("morph-possessive", features.getPossessive());
            dummy.addAttribute("morph-reflexive", features.getReflex());
            dummy.addAttribute("morph-pronounType", features.getPronType());
            dummy.addAttribute("morph-definiteness", features.getDefiniteness());
        }

        enhancement.setData(dummy.getData());
    }
}
