package werti.server.remote;

import werti.server.analysis.ViewRequestException;

/**
 * @author Aleksandar Dimitrov
 * @since 2016-10-19.10.16
 */
public class UrlFetchingException extends ViewRequestException {

    /**
     * An exception thrown if something went wrong while fetching
     * a remote URL.
     *
     * @param message The message
     * @param cause   The cause
     * @param status  The status code the serve should display
     */
    UrlFetchingException(String message, Throwable cause, int status) {
        super(message, cause, status);
    }
}
