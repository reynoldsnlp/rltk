package werti.uima.ae.util;

import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;

import java.io.BufferedReader;
import java.io.IOException;

/**
 * A runnable class that reads from a reader (that may
 * be fed by {@link Process}) and puts stuff read to
 * the logger as debug messages.
 * @author nott
 */
public class ExtCommandConsume2Logger implements Runnable {

    private static final Logger log = LogManager.getLogger();

    private BufferedReader reader;
    private String msgPrefix;

    /**
     * @param reader the reader to read from.
     * @param msgPrefix a string to prefix the read lines with.
     */
    public ExtCommandConsume2Logger(BufferedReader reader, String msgPrefix) {
        super();
        this.reader = reader;
        this.msgPrefix = msgPrefix;
    }

    /**
     * Reads from the reader linewise and puts the result to the logger.
     * Exceptions are never thrown but stuffed into the logger as well.
     */
    @Override
    public void run() {
        String line;
        try {
            while ( (line = reader.readLine()) != null ) {
                log.debug(msgPrefix + line);
            }
        } catch (IOException e) {
            log.error("Error in reading from external command.", e);
        }
    }
}