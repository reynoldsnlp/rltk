package werti.resources;

import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.apache.uima.UIMAFramework;
import org.apache.uima.resource.ExternalResourceDependency;
import org.apache.uima.resource.ResourceAccessException;
import org.apache.uima.resource.ResourceInitializationException;
import org.apache.uima.resource.impl.ResourceManager_impl;
import org.apache.uima.resource.metadata.ResourceManagerConfiguration;
import org.apache.uima.util.Level;

import java.lang.reflect.Constructor;
import java.lang.reflect.Field;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * This is a verbatim copy of {@link org.apache.uima.fit.util.SimpleNamedResourceManager}, except
 * for a bug fix in {@link #getFieldValue(Object, String)}. When UIMA-5024 is resolved (and we've
 * upgraded uima-fit), this class should be deleted.
 *
 * Additionally, we optionally de-qualify the key name in {@link #getResource(String)}, because
 * individual analysis engines in aggregate AEs query keys in their own namespace, not in the root
 * namespace.
 *
 * @see <a href="https://issues.apache.org/jira/browse/UIMA-5024">Bug in Jira</a>
 * @author Aleksandar Dimitrov, most code copied from UimaFit
 * @since 2017-01-08
 */
public class SimpleNamedResourceManager extends ResourceManager_impl {
    private static final Logger log = LogManager.getLogger();
    private Map<String, Object> externalContext;

    private boolean autoWireEnabled = false;

    @Override
    public Object getResource(String aName) throws ResourceAccessException {
        final Object r = super.getResource(aName);
        if (r == null) {
            final String rootName = aName.replaceAll(".*/", "/");
            return super.getResource(rootName);
        }
        return r;
    }

    @Override
    public synchronized void resolveAndValidateResourceDependencies(
            ExternalResourceDependency[] aDependencies,
            String aQualifiedContextName
    ) throws ResourceInitializationException {
        try {
            super.resolveAndValidateResourceDependencies(aDependencies, aQualifiedContextName);
        } catch (ResourceInitializationException e) {
            log.trace("Couldn't find resource binding for context name "
                    + aQualifiedContextName +
                    ", trying again with root context", e);
            super.resolveAndValidateResourceDependencies(aDependencies, "/");
        }
        log.trace("Found resource with context name {}.", aQualifiedContextName);
    }

    @SuppressWarnings({ "rawtypes", "unchecked" })
    @Override
    public void initializeExternalResources(ResourceManagerConfiguration aConfiguration,
                                            String aQualifiedContextName, java.util.Map<String, Object> aAdditionalParams)
            throws ResourceInitializationException {

        for (Map.Entry<String, Object> e : externalContext.entrySet()) {
            Object registration = mInternalResourceRegistrationMap.get(e.getKey());

            if (registration == null) {
                try {
                    // Register resource
                    ResourceRegistration reg = new ResourceRegistration(e.getValue(),
                            null,
                            aQualifiedContextName
                    );
                    ((Map) mInternalResourceRegistrationMap).put(e.getKey(), reg);

                    // Perform binding
                    if (isAutoWireEnabled()) {
                        mResourceMap.put(aQualifiedContextName + e.getKey(), e.getValue());
                    }
                } catch (Exception e1) {
                    throw new ResourceInitializationException(e1);
                }
            } else {
                try {
                    Object desc = getFieldValue(registration, "description");

                    if (desc != null) {
                        String definingContext = getFieldValue(registration, "definingContext");

                        if (aQualifiedContextName.startsWith(definingContext)) {
                            UIMAFramework.getLogger().logrb(
                                    Level.CONFIG,
                                    ResourceManager_impl.class.getName(),
                                    "initializeExternalResources",
                                    LOG_RESOURCE_BUNDLE,
                                    "UIMA_overridden_resource__CONFIG",
                                    new Object[]{e.getKey(), aQualifiedContextName, definingContext}
                            );
                        } else {
                            UIMAFramework.getLogger().logrb(Level.WARNING,
                                    ResourceManager_impl.class.getName(),
                                    "initializeExternalResources",
                                    LOG_RESOURCE_BUNDLE,
                                    "UIMA_duplicate_resource_name__WARNING",
                                    new Object[]{e.getKey(), definingContext, aQualifiedContextName}
                            );
                        }
                    }
                } catch (Exception e1) {
                    throw new ResourceInitializationException(e1);
                }
            }
        }

        super.initializeExternalResources(aConfiguration, aQualifiedContextName, aAdditionalParams);
    }

    public void setExternalContext(Map<String, Object> aExternalContext) {
        externalContext = aExternalContext;
    }

    public void setAutoWireEnabled(boolean aAutoWireEnabled) {
        autoWireEnabled = aAutoWireEnabled;
    }

    public boolean isAutoWireEnabled() {
        return autoWireEnabled;
    }

    /**
     * Instantiate a non-visible class.
     */
    @SuppressWarnings({ "unchecked", "rawtypes" })
    private static <T> T newInstance(String aClassName, Object... aArgs)
            throws ResourceInitializationException {
        Constructor constr = null;
        try {
            Class<?> cl = Class.forName(aClassName);

            List<Class> types = new ArrayList<Class>();
            List<Object> values = new ArrayList<Object>();
            for (int i = 0; i < aArgs.length; i += 2) {
                types.add((Class) aArgs[i]);
                values.add(aArgs[i + 1]);
            }

            constr = cl.getDeclaredConstructor(types.toArray(new Class[types.size()]));
            constr.setAccessible(true);
            return (T) constr.newInstance(values.toArray(new Object[values.size()]));
        } catch (Exception e) {
            throw new ResourceInitializationException(e);
        } finally {
            if (constr != null) {
                constr.setAccessible(false);
            }
        }
    }

    /**
     * Get a field value from a non-visible field.
     */
    @SuppressWarnings("unchecked")
    private static <T> T getFieldValue(Object aObject, String aFieldName)
            throws ResourceInitializationException {
        Field f = null;
        try {
            f = aObject.getClass().getDeclaredField(aFieldName);
            f.setAccessible(true);
            return (T) f.get(aObject);
        } catch (Exception e) {
            throw new ResourceInitializationException(e);
        } finally {
            if (f != null) {
                f.setAccessible(false);
            }
        }
    }
}
