package werti.server.analysis;

import org.jsoup.nodes.Document;
import werti.server.servlet.ViewRequest;

/**
 * @author Aleksandar Dimitrov
 * @since 2016-11-12
 */
public interface DocumentProcessor {
    Document process(ViewRequest viewRequest) throws DocumentProcessingException;
}
