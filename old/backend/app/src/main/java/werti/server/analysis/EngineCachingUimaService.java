package werti.server.analysis;

import com.google.common.cache.Cache;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.apache.uima.analysis_engine.AnalysisEngine;
import org.apache.uima.analysis_engine.AnalysisEngineDescription;
import org.apache.uima.analysis_engine.AnalysisEngineProcessException;
import org.apache.uima.resource.ResourceInitializationException;
import werti.uima.ConvenientCas;

import javax.inject.Inject;
import javax.inject.Named;
import java.util.concurrent.ExecutionException;

/**
 * @author Aleksandar Dimitrov
 * @since 2017-06-09
 */
public class EngineCachingUimaService implements UimaService {
    private static final Logger log = LogManager.getLogger();
    private static final int MB = 1024 * 1024;
    private final Cache<String, AnalysisEngine> engineCache;
    private final FileBackedUimaService fileBackedService;

    @Inject
    public EngineCachingUimaService(
            final @Named("engine-cache") Cache<String, AnalysisEngine> engineCache,
            final FileBackedUimaService fileBackedService
    ) {
        this.engineCache = engineCache;
        this.fileBackedService = fileBackedService;
    }

    private String getIdentifierFor(final AnalysisEngineDescription description) {
        return description.getAnalysisEngineMetaData().getName();
    }

    private AnalysisEngine createEngine(final String name, final AnalysisEngineDescription description) throws
            ResourceInitializationException {
        final Runtime runtime = Runtime.getRuntime();
        log.info(
                "Producing {}. Memory: {}MB free, {}MB total, {}MB max)",
                name,
                runtime.freeMemory() / MB,
                runtime.totalMemory() / MB,
                runtime.maxMemory() / MB
        );

        final AnalysisEngine engine = createEngine(description);
        log.info(
                "Produced {}. Memory: {}MB free, {}MB total, {}MB max)",
                name,
                runtime.freeMemory() / MB,
                runtime.totalMemory() / MB,
                runtime.maxMemory() / MB
        );

        return engine;
    }

    private AnalysisEngine createEngine(final AnalysisEngineDescription description) throws ResourceInitializationException {
        return fileBackedService.configureEngine(description);
    }

    private AnalysisEngine getEngine(
            final String name,
            final AnalysisEngineDescription description
    ) throws ResourceInitializationException, ExecutionException {
        if (name == null) {
            log.warn("Engine has no name; it won't be cached.");
            return createEngine(description);
        }

        log.info("AE cache request for {}, cache currently holding {} items.", name, engineCache.size());
        return engineCache.get(name, () -> createEngine(name, description));
    }

    @Override
    public void runPipeline(
            ConvenientCas cas,
            AnalysisEngineDescription analysisEngineDescription
    ) throws DocumentAnalysisException {
        try {
            final String name = getIdentifierFor(analysisEngineDescription);
            final AnalysisEngine engine = getEngine(name, analysisEngineDescription);
            cas.applyEngine(engine);
        } catch (ResourceInitializationException | AnalysisEngineProcessException | ExecutionException e) {
            throw new DocumentAnalysisException(e);
        }
    }
}
