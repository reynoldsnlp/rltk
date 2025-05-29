package werti.uima.ae.util;

import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import werti.Language;
import werti.ViewContext;

import java.io.*;
import java.util.ArrayList;
import java.util.List;

/**
 * This class handles the vislcg3 process using the ProcessBuilder class
 * with a pipeline.
 *
 * @author Eduard Schaf
 * @since 12.12.16
 */
public class Vislcg3Process {

    private static final Logger log =
            LogManager.getLogger();

    private final String CGCONV_LOC;
    private final String VISLCG_3_LOC;
    private final String VISLCG_3_DIS_GRAMMAR_LOC;

    public Vislcg3Process(ViewContext viewContext, final Language language) {
        CGCONV_LOC = viewContext.getOrDefault(
                "visl.cg-conv.binary",
                "/usr/bin/cg-conv"
        );
        VISLCG_3_LOC = viewContext.getOrDefault(
                "visl.cg3.binary",
                "/usr/local/werti/bin/vislcg3"
        );
        VISLCG_3_DIS_GRAMMAR_LOC = viewContext.getResourcePath(
                "visl.cg3.grammar",
                language
        ).toString();
    }

    /**
     * Create a process for vislcg3 and run it on the provided analyses with the
     * provided argument list.
     *
     * @param argList the argument list we will run the process with
     * @param analyses the data vislcg3 is processing
     * @return the processed data returned from vislcg3
     * @throws IOException when there is a problem with the process, buffered writer or reader
     */
    public String runVislcg3(List<String> argList, String analyses) throws IOException {

        // obtain process
        ProcessBuilder builder = new ProcessBuilder(argList);
        Process process = builder.start();

        // get input and output streams (are they internally buffered??)
        BufferedWriter toCG =  new BufferedWriter(new OutputStreamWriter(process.getOutputStream()));
        BufferedReader fromCG = new BufferedReader(new InputStreamReader(process.getInputStream()));
        BufferedReader errorCG = new BufferedReader(new InputStreamReader(process.getErrorStream()));

        // take care of VislCG's STDERR inside a special thread.
        ExtCommandConsume2Logger stderrConsumer = new ExtCommandConsume2Logger(errorCG, "VislCG STDERR: ");
        Thread stderrConsumerThread = new Thread(stderrConsumer, "VislCG STDERR consumer");
        stderrConsumerThread.start();

        // take care of VislCG's STDOUT in the very same fashion
        ExtCommandConsume2String stdoutConsumer = new ExtCommandConsume2String(fromCG);
        Thread stdoutConsumerThread = new Thread(stdoutConsumer, "VislCG STDOUT consumer");
        stdoutConsumerThread.start();

        // write input to VislCG. VislCG may block the entire pipe if its output
        // buffers run full. However, they will sooner or later be emptied by
        // the consumer threads started above, which will then cause unblocking.
        toCG.write(analyses);
        toCG.close();

        // wait until the output consumer has read all of VislCGs output,
        // close all streams and return contents of the buffer.
        try {
            stdoutConsumerThread.join();
        } catch (InterruptedException e) {
            log.error("Error in joining output consumer of VislCG with regular thread, going mad.", e);
            Thread.currentThread().interrupt();
        }
        fromCG.close();
        errorCG.close();
        String output = stdoutConsumer.getBuffer();

        // there is an exception in vislcg3 where the output is messed up should you
        // feed it with an input that contains only one word and this word has no readings (+?)
        // clean up this mess here
        if(output.endsWith(
                "\"<+>\"" + System.lineSeparator() +
                "\"<?>\"" + System.lineSeparator() + System.lineSeparator()
        )){
            String inputWord = analyses.split("\\t")[0];
            output = "\"<" + inputWord + ">\"" + System.lineSeparator() + System.lineSeparator();
        }

        return output;
    }

    /**
     * Create an argument list for disambiguation only.
     *
     * @return the argument list the process will run with
     */
    public List<String> buildArgumentListDisambiguation(){
        List<String> argList = new ArrayList<>();

        argList.add(VISLCG_3_LOC);
        argList.add("-g");
        argList.add(VISLCG_3_DIS_GRAMMAR_LOC);

        return argList;
    }

    /**
     * Create an argument list for conversion with cg conv and disambiguation
     * afterwards.
     *
     * @return the argument list the process will run with
     */
    public List<String> buildArgumentListConversionAndDisambiguation(){
        List<String> argList = new ArrayList<>();

        argList.add("/bin/sh"); // we need the shell to use the pipe function (|)
        argList.add("-c");
        argList.add(CGCONV_LOC + // convert to vislcg3 format
                        " | " + VISLCG_3_LOC + " -g " + VISLCG_3_DIS_GRAMMAR_LOC);

        return argList;
    }

    /**
     * Create an argument list for conversion with cg conv and disambiguation
     * with trace afterwards.
     *
     * @return the argument list the process will run with
     */
    public List<String> buildArgumentListConversionAndDisambiguationWithTrace(){
        List<String> argList = new ArrayList<>();

        argList.add("/bin/sh"); // we need the shell to use the pipe function (|)
        argList.add("-c");
        argList.add(CGCONV_LOC + // convert to vislcg3 format
                            " | " + VISLCG_3_LOC + " -t -g " + VISLCG_3_DIS_GRAMMAR_LOC +
                            " | sed -E 's/\\+?[A-Z]+\\:[0-9]+\\s*//g'" +
                            " | sed -E 's/@[A-Z]+→*\\s*$//g'"
        );

        return argList;
    }
}
