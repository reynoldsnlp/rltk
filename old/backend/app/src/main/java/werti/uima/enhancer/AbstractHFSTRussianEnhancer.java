package werti.uima.enhancer;

import com.google.common.base.Stopwatch;
import org.apache.commons.io.FileUtils;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.apache.uima.UimaContext;
import org.apache.uima.analysis_engine.AnalysisEngineProcessException;
import org.apache.uima.fit.component.JCasAnnotator_ImplBase;
import org.apache.uima.fit.descriptor.ExternalResource;
import org.apache.uima.jcas.JCas;
import org.apache.uima.resource.ResourceInitializationException;

import werti.Language;
import werti.ViewContext;
import werti.resources.FileBackedResourceFactory;
import werti.resources.NoResourceException;
import werti.uima.ConvenientCas;
import werti.uima.types.annot.CGToken;
import werti.util.*;
import werti.uima.enhancer.translation.*;

import java.io.IOException;
import java.io.FileNotFoundException;
import java.io.FileReader;
import java.nio.file.Path;
import java.util.List;
import java.util.Map;
import java.util.concurrent.TimeUnit;

/**
 * @author Aleksandar Dimitrov
 * @since 2017-03-24
 */
public abstract class AbstractHFSTRussianEnhancer extends JCasAnnotator_ImplBase {
    private static final Logger log = LogManager.getLogger();

    @ExternalResource
    protected FileBackedResourceFactory resourceFactory;
    @ExternalResource
    protected ViewContext viewContext;

    protected RusEnhancerUtils enhancerUtils;
    protected HFSTGenerator hfstGenerator;

    protected Map<String, String> imperfectiveToPerfectiveVerbMap;
    protected Map<String, String> perfectiveToImperfectiveVerbMap;
    protected Map<String, Word> lemmaToTranslationsMap;
    protected List<String> adjectivesToExcludeFromParticiples;

    protected RussianEnhancementCreator enhancementCreator;
    protected RusDistractorGenerator distractorGenerator;

    @Override
    public void initialize(UimaContext uimaContext) throws ResourceInitializationException {
        super.initialize(uimaContext);
        final KryoSerialization kryoSerialization = new KryoSerialization(viewContext);
        enhancerUtils = new RusEnhancerUtils();

        try {
            hfstGenerator = new HFSTGenerator(resourceFactory, Language.RUSSIAN);
        } catch (NoResourceException e) {
            throw new ResourceInitializationException(e);
        }

        imperfectiveToPerfectiveVerbMap = kryoSerialization.loadMap("imperfectiveToPerfectiveVerbMap");
        perfectiveToImperfectiveVerbMap = kryoSerialization.loadMap("perfectiveToImperfectiveVerbMap");

        try {
            Path adjectiveData = viewContext.getResourcePath("participles.adjectivesToExcludeFromParticiples", Language.RUSSIAN);
            adjectivesToExcludeFromParticiples = FileUtils.readLines(adjectiveData.toFile(), "utf-8");
            log.info("adjectivesToExcludeFromParticiplesList loaded.");
        } catch(IOException e) {
            log.info("Loading of adjectivesToExcludeFromParticiples.txt failed.");
        }

        distractorGenerator = new RusDistractorGenerator(
                enhancerUtils,
                hfstGenerator,
                imperfectiveToPerfectiveVerbMap,
                perfectiveToImperfectiveVerbMap
        );
        enhancementCreator = new RussianEnhancementCreator(hfstGenerator, enhancerUtils, distractorGenerator);
    }

    @Override
    public final void process(JCas jcas) throws AnalysisEngineProcessException {
        log.info("Started enhancement.");
        final Stopwatch timer = Stopwatch.createStarted();

        final ConvenientCas cas = new ConvenientCas(jcas);
        cas.select(CGToken.class).forEach(cgToken -> processCGToken(cgToken, cas));

        log.info("Finished enhancement.");
        timer.stop();
        log.info("Total execution time: {} seconds.", timer.elapsed(TimeUnit.SECONDS));
    }

    protected abstract void processCGToken(CGToken cgtoken, ConvenientCas cas);
}
