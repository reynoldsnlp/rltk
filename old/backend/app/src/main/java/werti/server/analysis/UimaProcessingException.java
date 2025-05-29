package werti.server.analysis;

import javax.servlet.http.HttpServletResponse;

/**
 * High-level exception used by servlets to indicate processing
 * trouble to the outside world
 *
 * @author Aleksandar Dimitrov
 * @since 2016-10-09
 */
public class UimaProcessingException extends ViewRequestException {
    public UimaProcessingException(Exception cause) {
        super(
                "UIMA Processing failed",
                cause,
                HttpServletResponse.SC_INTERNAL_SERVER_ERROR
        );
    }
}
