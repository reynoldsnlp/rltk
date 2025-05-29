package werti.server.interaction.authentication;

import werti.server.analysis.ViewRequestException;

import javax.servlet.http.HttpServletResponse;

/**
 * @author Aleksandar Dimitrov
 * @since 2017-01-28
 */
public class AuthenticationException extends ViewRequestException {
    public AuthenticationException(String message) {
        super(message, HttpServletResponse.SC_FORBIDDEN);
    }

    public AuthenticationException(ViewRequestException cause) {
        super(cause);
    }

    public AuthenticationException(Throwable e) {
        super(e, HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
    }
}
