package werti.server.analysis;

import com.google.gson.Gson;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import werti.server.data.ErrorData;

import javax.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.io.Writer;

/**
 * @author Aleksandar Dimitrov
 * @since 2016-10-20
 */
public class ViewRequestException extends Exception {
    private static final Logger log = LogManager.getLogger();
    private final int status;

    /**
     * An exception thrown if something went wrong during a call
     * to the VIEW API.
     *
     * @param message The message
     * @param cause   The cause
     * @param statusCode  The status code the server should display
     */
    public ViewRequestException(
            final String message,
            final Throwable cause,
            final int statusCode
    ) {
        super(message, cause);
        this.status = statusCode;
    }

    public ViewRequestException(Throwable e, final int status) {
        super(e);
        this.status = status;
    }

    public ViewRequestException(String s) {
        super(s);
        this.status = HttpServletResponse.SC_BAD_REQUEST;
    }

    public ViewRequestException(Throwable e) {
        super(e);
        this.status = HttpServletResponse.SC_BAD_REQUEST;
    }

    public ViewRequestException(final String message, final int status) {
        super(message);
        this.status = status;
    }

    public ViewRequestException(String message, Exception exception) {
        super(message, exception);
        status = HttpServletResponse.SC_INTERNAL_SERVER_ERROR;
    }

    /**
     * @return The HTTP response code displayable to the API's caller
     */
    public int getStatus() {
        return this.status;
    }

    public void respond(final HttpServletResponse response, final Gson gson) {
        response.setStatus(this.status);
        try {
            final Writer responseWriter = response.getWriter();
            gson.toJson(ErrorData.create(
                    this.getStatus(),
                    this.getMessage(),
                    this.getClass().getName()
            ), responseWriter);
        } catch (IOException e) {
            log.error("Can't respond to exception, writer unavailable", this);
            log.error("The exception was ", e);
        }
    }
}
