package werti.server.data;

/**
 * @author Aleksandar Dimitrov
 * @since 2016-09-9
 */
public class ViewConfigurationException extends Exception {
    public ViewConfigurationException(String message) {
        super(message);
    }

    public ViewConfigurationException(Throwable e) {
        super(e);
    }
}
