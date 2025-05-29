package werti.server.remote;

import org.jsoup.Connection;
import org.jsoup.HttpStatusException;
import org.jsoup.Jsoup;
import org.jsoup.UnsupportedMimeTypeException;
import org.jsoup.nodes.Document;
import werti.server.servlet.ViewParameters;

import javax.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.net.SocketTimeoutException;

/**
 * Small utility class to wrap the static JSoup call.
 *
 * @author Aleksandar Dimitrov
 * @since 2016-10-05
 */
public class JSoupUrlFetcher implements UrlFetcher {
    @Override
    public Document getDocument(final ViewParameters viewRequest) throws UrlFetchingException {
        final Connection connection =
                Jsoup.connect(viewRequest.getUrl().toString()).userAgent("VIEW 2.0");
        try {
            return connection.get();
        } catch (HttpStatusException e) {
            throw new UrlFetchingException(
                    "Request failed: " + e.getMessage() + " (" + e.getStatusCode() + ")",
                    e,
                    // we might be stretching the meaning of 502 here, but it kinda does fit
                    HttpServletResponse.SC_BAD_GATEWAY
            );
        } catch (SocketTimeoutException e) {
            throw new UrlFetchingException(
                    "Request timed out: " + e.getMessage(),
                    e,
                    HttpServletResponse.SC_GATEWAY_TIMEOUT
            );
        } catch (UnsupportedMimeTypeException e) {
            throw new UrlFetchingException(
                    "Remote site responded with unsupported mime type: " + e.getMimeType(),
                    e,
                    HttpServletResponse.SC_BAD_GATEWAY
            );
        } catch (IOException e) {
            throw new UrlFetchingException(
                    "Problem connecting to host " + viewRequest.getUrl().toString(),
                    e,
                    HttpServletResponse.SC_BAD_GATEWAY
            );
        }
    }
}
