package werti.server.remote;

import org.jsoup.nodes.Document;
import werti.server.servlet.ViewParameters;

/**
 * @author Aleksandar Dimitrov
 * @since 2016-10-12.10.16
 */
public interface UrlFetcher {
    Document getDocument(final ViewParameters viewRequest) throws UrlFetchingException;
}
