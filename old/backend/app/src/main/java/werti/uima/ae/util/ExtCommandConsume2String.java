package werti.uima.ae.util;

import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;

import java.io.BufferedReader;
import java.io.IOException;

/**
 * A runnable class that reads from a reader (that may
 * be fed by {@link Process}) and puts stuff read into a variable.
 * @author nott
 */
public class ExtCommandConsume2String implements Runnable {

    private static final Logger log = LogManager.getLogger();

    private BufferedReader reader;
    private boolean finished;
    private StringBuilder buffer;

    /**
     * @param reader the reader to read from.
     */
    public ExtCommandConsume2String(BufferedReader reader) {
        super();
        this.reader = reader;
        finished = false;
        buffer = new StringBuilder();
    }

    /**
     * Reads from the reader linewise and puts the result to the buffer.
     * See also {@link #getBuffer()} and {@link #isDone()}.
     */
    @Override
    public void run() {
        String line;
        try {
            while ((line = reader.readLine()) != null) {
                buffer.append(line).append(System.lineSeparator());
            }
        } catch (IOException e) {
            log.error("Error in reading from external command.", e);
        }
        finished = true;
    }

    /**
     * @return true if the reader read by this class has reached its end.
     */
    public boolean isDone() {
        return finished;
    }

    /**
     * @return the string collected by this class or null if the stream has not reached
     * its end yet.
     */
    public String getBuffer() {
        if (!finished) {
            return null;
        }

        return buffer.toString();
    }
}