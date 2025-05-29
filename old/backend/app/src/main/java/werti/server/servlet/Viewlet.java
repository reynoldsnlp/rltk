package werti.server.servlet;

import com.google.gson.Gson;
import com.google.inject.Singleton;
import com.google.inject.name.Named;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.jsoup.nodes.Node;
import org.jsoup.select.NodeVisitor;
import werti.server.analysis.DocumentProcessingException;
import werti.server.analysis.DocumentProcessor;
import werti.server.analysis.ViewRequestException;
import werti.server.data.Activity;
import werti.server.data.JsonParameters;
import werti.server.data.Topics;
import werti.server.remote.UrlFetcher;
import werti.server.remote.UrlFetchingException;

import javax.inject.Inject;
import javax.servlet.ServletException;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import java.io.IOException;

/**
 * @author Aleksandar Dimitrov
 * @since 2016-09-9/24/16
 */
@Singleton
public class Viewlet extends HttpServlet {
    private static final Logger log = LogManager.getLogger();
    private final transient Topics topics;
    private final transient UrlFetcher fetcher;
    private final transient DocumentProcessor processor;
    private final transient Gson gson;

    @Inject
    public Viewlet(
            final DocumentProcessor processor,
            final UrlFetcher fetcher,
            final Topics topics,
            @Named("view-gson") Gson gson
    ) {
        this.topics = topics;
        this.fetcher = fetcher;
        this.processor = processor;
        this.gson = gson;
    }

    @Override
    protected void doGet(HttpServletRequest req, HttpServletResponse resp)
            throws ServletException, IOException {
        try {
            handleGet(req, resp);
        } catch (IOException e) {
            log.error("Critical: IO error while responding.", e);
        }
    }

    @Override
    protected void doPost(HttpServletRequest req, HttpServletResponse resp)
            throws ServletException, IOException {
        try {
            handlePost(req, resp);
        } catch (IOException e) {
            log.error("Critical: IO error while responding.", e);
        }
    }

    private void handleGet(
            final HttpServletRequest request,
            final HttpServletResponse response
    ) throws IOException {
        try {
            final ViewParameters parameters = new ViewQueryParameters(topics, request);
            final Document document = fetcher.getDocument(parameters);
            makeLinksAbsolute(document);
            injectJs(document, parameters.getActivity());
            final ViewRequest viewRequest = ViewRequest.create(parameters, document);
            final Document result = processor.process(viewRequest);
            response.setCharacterEncoding("UTF-8");
            response.getWriter().print(result.outerHtml());
        } catch (UrlFetchingException e) {
            log.debug("Error fetching remote document.", e);
            response.sendError(
                    e.getStatus(),
                    "Error fetching remote document: " + e.getMessage()
            );
        } catch (DocumentProcessingException e) {
            log.warn("Error while processing document.", e);
            response.sendError(
                    HttpServletResponse.SC_INTERNAL_SERVER_ERROR,
                    "Error processing request: " + e.getMessage()
            );
        } catch (ViewRequestException e) {
            log.debug("Received invalid request.", e);
            response.sendError(
                    e.getStatus(),
                    "Received invalid request: " + e.getMessage()
            );
        }
    }

    private void handlePost(
            final HttpServletRequest request,
            final HttpServletResponse response
    ) throws IOException {
        try {
            final JsonParameters parameters = new JsonParameters(topics, request, gson);
            final ViewRequest viewRequest = ViewRequest.create(parameters, parameters.getDocument());
            final Document result = processor.process(viewRequest);
            response.setCharacterEncoding("UTF-8");
            response.getWriter().print(result.body().outerHtml());
        } catch (DocumentProcessingException e) {
            log.warn("Error while processing document.", e);
            response.sendError(
                    HttpServletResponse.SC_INTERNAL_SERVER_ERROR,
                    "Error processing request: " + e.getMessage()
            );
        } catch (IOException e) {
            log.debug("Error reading request.", e);
            response.sendError(
                    HttpServletResponse.SC_BAD_REQUEST,
                    "Error reading request: " + e.getMessage()
            );
        } catch (ViewRequestException e) {
            log.debug("Received invalid request.", e);
            response.sendError(
                    e.getStatus(),
                    "Received invalid request."
            );
        }
    }

    private void injectJs(Document document, Activity activity) {
        final Element js = document.createElement("script");
        js.attr("src", "/js/activity/" + activity.activity() + ".js");
        document.body().appendChild(js);

        final Element css = document.createElement("link");
        css.attr("rel", "stylesheet");
        css.attr("href", "/css/activity/" + activity.activity() + ".css");
        document.head().appendChild(css);
    }

    /**
     * Traverses a document and resolves every relative url to base URL.
     * This is a destructive update on the document, as its nodes will get new
     * attributes.
     * @param document The document to mutate
     */
    private void makeLinksAbsolute(Document document) {
        document.traverse(new NodeVisitor() {
            @Override
            public void head(Node node, int depth) {
                if (node instanceof Element) {
                    final Element element = (Element) node;
                    absolutifyElement(element, "src");
                    absolutifyElement(element, "href");
                }
            }

            private void absolutifyElement(final Element element, final String attribute) {
                final String absoluteUrl = element.absUrl(attribute);
                if (absoluteUrl.length() > 0) {
                    element.attr(attribute, absoluteUrl);
                }
            }

            @Override
            public void tail(Node node, int depth) { /* noting is done on tail */ }
        });
    }
}
