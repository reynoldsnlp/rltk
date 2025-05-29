package werti.server.modules;

import com.google.common.cache.Cache;
import com.google.common.cache.CacheBuilder;
import com.google.inject.AbstractModule;
import com.google.inject.Provides;
import com.google.inject.name.Named;
import org.jsoup.nodes.Document;
import werti.server.cache.AnalysisCacheKey;
import werti.uima.ConvenientCas;

import java.net.URL;
import java.util.concurrent.TimeUnit;

/**
 * @author Aleksandar Dimitrov
 * @since 2016-11-12
 */
public class CacheModule extends AbstractModule{
    @Override
    protected void configure() {
        // nothing, we use providers
    }

    @Provides @Named("document-cache")
    protected Cache<URL, Document> documentCacheProvider() {
        return CacheBuilder.newBuilder()
                .maximumSize(20)
                .expireAfterAccess(3, TimeUnit.HOURS)
                .build();
    }

    @Provides @Named("topic-cache")
    protected Cache<AnalysisCacheKey, ConvenientCas> topicCacheProvider() {
        return CacheBuilder.newBuilder()
                .maximumSize(10)
                .expireAfterAccess(3, TimeUnit.HOURS)
                .build();
    }
}
