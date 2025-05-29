package werti;

/**
 * @author Aleksandar Dimitrov
 * @since  2016-09-09
 */
public class ViewContextException extends Exception {
    public ViewContextException(String message) {
        super(message);
    }

    public ViewContextException(Throwable throwable) {
        super(throwable);
    }
}
