package werti.server.modules;

import com.google.inject.AbstractModule;
import werti.server.remote.UrlFetcher;
import werti.server.cache.CachingUrlFetcher;

/**
 * @author Aleksandar Dimitrov
 * @since 2016-10-24.10.16
 */
public class UrlModule extends AbstractModule {
    @Override
    public void configure() {
        bind(UrlFetcher.class).to(CachingUrlFetcher.class);
    }
}
