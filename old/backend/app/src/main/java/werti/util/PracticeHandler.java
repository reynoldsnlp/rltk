package werti.util;

import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;

/**
 * Methods needed for processing practice response.
 * 
 * @author Adriane Boyd
 *
 */
public class PracticeHandler {
	private static final Logger log =
		LogManager.getLogger();
	
	private PostRequest requestInfo;
	
	public PracticeHandler(PostRequest aRequestInfo) {
		requestInfo = aRequestInfo;
	}
	
	public String process() {
		return "";
	}
}
