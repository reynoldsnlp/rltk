package werti.server.cache;

import com.google.common.cache.Cache;
import com.google.inject.Inject;
import com.google.inject.name.Named;
import org.jsoup.nodes.Document;
import werti.server.remote.JSoupUrlFetcher;
import werti.server.remote.UrlFetcher;
import werti.server.remote.UrlFetchingException;
import werti.server.servlet.ViewParameters;

import java.net.URL;

/**
 * @author Aleksandar Dimitrov
 * @since 2016-11-12
 */
public class CachingUrlFetcher implements UrlFetcher {
    private final Cache<URL, Document> cache;
    private final UrlFetcher fetcher;

    @Inject
    public CachingUrlFetcher(
            @Named("document-cache") final Cache<URL, Document> cache
    ) {
        this.cache = cache;
        this.fetcher = new JSoupUrlFetcher();
    }

    @Override
    public Document getDocument(final ViewParameters viewRequest) throws UrlFetchingException {
        final Document result = cache.getIfPresent(viewRequest.getUrl());
        if (result == null) {
            return fetcher.getDocument(viewRequest);
        }
        return result;
    }
}
