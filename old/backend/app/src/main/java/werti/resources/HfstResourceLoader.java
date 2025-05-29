package werti.resources;

import fi.seco.hfst.*;

import java.io.DataInputStream;
import java.io.IOException;
import java.io.InputStream;

/**
 * @author Eduard Schaf
 * @author Aleksandar Dimitrov
 * @since 2017-01-12
 */
public class HfstResourceLoader implements ResourceLoader<InputStream, Transducer> {
    @Override
    public Transducer load(InputStream resource) throws NoResourceException {
        try (
                DataInputStream transducerDataStream = new DataInputStream(resource)
        ) {
            TransducerHeader transducerHeader = new TransducerHeader(transducerDataStream);
            TransducerAlphabet transducerAlphabet = new TransducerAlphabet(
                    transducerDataStream,
                    transducerHeader.getSymbolCount());

            final Transducer transducer;
            if (transducerHeader.isWeighted()) { // analyser and normal generator
                transducer = new WeightedTransducer(
                        transducerDataStream,
                        transducerHeader,
                        transducerAlphabet);
            } else { // stress generator
                transducer = new UnweightedTransducer(
                        transducerDataStream,
                        transducerHeader,
                        transducerAlphabet);
            }
            return transducer;
        } catch (IOException e) {
            throw new NoResourceException(e);
        }
    }
}
