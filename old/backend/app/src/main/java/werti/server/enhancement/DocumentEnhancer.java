package werti.server.enhancement;

import org.jsoup.nodes.Document;

import java.util.List;

/**
 * @author Aleksandar Dimitrov
 * @since 2016-11-12
 */
public interface DocumentEnhancer<T> {
    Document enhance(T analysisResult, Document input, List<Enhancement> enhancements);
}
