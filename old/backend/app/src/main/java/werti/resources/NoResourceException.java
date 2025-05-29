package werti.resources;

/**
 * @author Aleksandar Dimitrov
 * @since  2016-09-09
 */
public class NoResourceException extends Exception {
    NoResourceException(String m) {
        super(m);
    }

    public NoResourceException(Throwable t) {
        super(t);
    }
}
