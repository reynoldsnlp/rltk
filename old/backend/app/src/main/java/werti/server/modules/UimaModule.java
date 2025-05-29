package werti.server.modules;

import com.google.common.cache.Cache;
import com.google.common.cache.CacheBuilder;
import com.google.inject.AbstractModule;
import com.google.inject.Provides;
import com.google.inject.TypeLiteral;
import com.google.inject.name.Named;
import com.google.inject.name.Names;
import org.apache.http.client.HttpClient;
import org.apache.http.impl.client.HttpClients;
import org.apache.uima.UIMAException;
import org.apache.uima.analysis_engine.AnalysisEngine;
import org.apache.uima.fit.factory.JCasFactory;
import werti.server.analysis.CasPopulator;
import werti.server.analysis.EngineCachingUimaService;
import werti.server.analysis.UimaService;
import werti.uima.ConvenientCas;

/**
 * @author Aleksandar Dimitrov
 * @since 2016-10-09
 */
public class UimaModule extends AbstractModule {
    private int maximumSize;

    public UimaModule() {
        super();
        this.maximumSize = 10;
    }

    public UimaModule(final int maximumSize) {
        super();
        this.maximumSize = maximumSize;
    }

    @Override
    protected void configure() {
        final Cache<String, AnalysisEngine> analysisEngineCache = CacheBuilder
                .newBuilder()
                .maximumSize(this.maximumSize)
                .build();
        bind(new TypeLiteral<Cache<String, AnalysisEngine>>(){})
                .annotatedWith(Names.named("engine-cache"))
                .toInstance(analysisEngineCache);
        bind(UimaService.class).to(EngineCachingUimaService.class);
        final HttpClient client = HttpClients.createDefault();
        bind(HttpClient.class).toInstance(client);
    }

    @Provides @Named("fresh-cas")
    ConvenientCas provideJCas() throws UIMAException {
        return new ConvenientCas(JCasFactory.createJCas());
    }

    @Provides
    CasPopulator provideCasPopulator() {
        return new CasPopulator();
    }
}
