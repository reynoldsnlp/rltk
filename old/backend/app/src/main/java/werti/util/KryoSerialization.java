package werti.util;

import com.esotericsoftware.kryo.Kryo;
import com.esotericsoftware.kryo.io.Input;
import com.esotericsoftware.kryo.serializers.DeflateSerializer;
import com.esotericsoftware.kryo.serializers.MapSerializer;
import com.google.common.collect.ImmutableMap;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import werti.Language;
import werti.ViewContext;
import werti.uima.enhancer.translation.*;

import java.io.*;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.HashMap;
import java.util.Map;

/**
 * This class can load Kryo-based serialized data.
 *
 * @author Eduard Schaf
 * @since 20.12.16
 */
public class KryoSerialization {
    private static final Logger log = LogManager.getLogger();

    private static Kryo kryo = new Kryo();
    private final ViewContext viewContext;

    public KryoSerialization(ViewContext viewContext) {
        this.viewContext = viewContext;
    }

    /**
     * Registers a map with a given map class, key class, value class
     * and deflate serializer with a map serializer in kryo.
     *
     * @param mapClass the class of the map
     * @param keyClass the class of the key of the map
     * @param valueClass the class of the value of the map
     */
    private static void registerMap (Class mapClass, Class keyClass, Class valueClass) {

        MapSerializer mapSerializer = new MapSerializer();
        mapSerializer.setKeyClass(keyClass, kryo.getSerializer(keyClass));
        mapSerializer.setKeysCanBeNull(false);
        mapSerializer.setValueClass(valueClass, kryo.getSerializer(valueClass));
        mapSerializer.setValuesCanBeNull(false);

        kryo.register(mapClass, new DeflateSerializer(mapSerializer));
    }

    /**
     * Given the map name, deserialize the map located in the properties.
     *
     * @param mapName the name of the map
     * @return the map stored on the hard drive
     */
    @SuppressWarnings("unchecked")
    public Map<String, String> loadMap(String mapName) {

        Map<String, String> map = new HashMap<>();

        registerMap(HashMap.class, String.class, String.class);

        Path serializedData;
        serializedData = viewContext.getResourcePath("kryo." + mapName, Language.RUSSIAN);

        if (serializedData == null) {
            return ImmutableMap.of();
        }
        try {
            Input input = new Input(Files.newInputStream(serializedData));

            if(mapName.equals("lemmaToExemplarMap")) {
                map = kryo.readObject(input, HashMap.class);
            }
            else {
                map = (HashMap) kryo.readClassAndObject(input);
            }
            log.info(mapName+" loaded");
            return map;
        } catch(IOException ioe) {
            log.error("There was a problem when trying to load the map:", ioe);
            return ImmutableMap.of();
        }
    }

    /**
     * Given the map name, deserialize the map located in the properties.
     *
     * @return the map stored on the hard drive
     */
    public Map<String, Word> loadTranslationMap() {
        Kryo trnsKryo = new Kryo();
        trnsKryo.register(HashMap.class);
        trnsKryo.register(String.class);
        trnsKryo.register(Word.class);
        trnsKryo.register(Sense.class);
        trnsKryo.register(Head.class);
        trnsKryo.register(Example.class);
        trnsKryo.register(Conjugation.class);

        log.info("Loading translations map...");
        Map<String, Word> map;

        Path serializedData;
        serializedData = viewContext.getResourcePath("kryo.lemmaToTranslationsMapWiktExtract", Language.RUSSIAN);

        if (serializedData == null) {
            return ImmutableMap.of();
        }
        try {
            Input input = new Input(Files.newInputStream(serializedData));
            map = (HashMap) trnsKryo.readClassAndObject(input);

            log.info("lemmaToTranslationsMap loaded");
            return map;
        } catch(IOException ioe) {
            log.error("There was a problem when trying to load the map:", ioe);
            return ImmutableMap.of();
        }
    }
}
