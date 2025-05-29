package werti;

/**
 * @author Aleksandar Dimitrov
 * @since  2016-09-09
 */
public class NoSuchPathException extends Exception {
    public NoSuchPathException(String message) {
        super(message);
    }

    public NoSuchPathException(Throwable cause) {
        super(cause);
    }
}
