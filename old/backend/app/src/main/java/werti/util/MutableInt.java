package werti.util;

/**
 * This class represents a mutable integer value, which is especially useful
 * and fast for counting frequencies inside a map.
 *
 * @author Eduard Schaf
 * @since 14.12.16
 */
public class MutableInt {
    private int value = 1; // note that we start at 1 since we're counting
    /**
     * Increment the mutable int by one.
     */
    public void increment () {
        ++value;
    }
    /**
     * Get the value of the mutable int.
     * @return the mutable int value.
     */
    public int  get () {
        return value;
    }
}
