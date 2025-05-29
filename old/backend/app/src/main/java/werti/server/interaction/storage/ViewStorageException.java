package werti.server.interaction.storage;

import werti.server.analysis.ViewRequestException;

import javax.servlet.http.HttpServletResponse;
import java.sql.SQLException;

/**
 * @author Aleksandar Dimitrov
 * @since 2017-01-29
 */
public class ViewStorageException extends ViewRequestException {
    public ViewStorageException(String message) {
        super(message, HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
    }

    public ViewStorageException(SQLException e) {
        super(e, HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
    }
}
