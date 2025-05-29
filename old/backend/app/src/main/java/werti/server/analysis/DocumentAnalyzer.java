package werti.server.analysis;

import werti.server.servlet.ViewRequest;

/**
 * @author Aleksandar Dimitrov
 * @since 2016-11-12
 */
public interface DocumentAnalyzer<T> {
    T analyze(ViewRequest viewRequest) throws DocumentAnalysisException;
}
