export default (selections, language) => {
  console.log('Particles!');
  if (language !== 'de') {
    console.error(`Language ${language} is not supported`);
    return [];
  }

  const tags = {
    particles: "PTKVZ",
    adverbs: "ADV",
    finiteVerbs: "VVFIN",
  };

  const particles = Array.from(document.querySelectorAll(`[data-relation="svp"][data-pos="${tags.particles}"]`));
  const verbs = particles.map((particle) => {
    const head = particle.getAttribute('data-head');
    return document.querySelector(`[data-depid="${head}"]`);
  });

  return particles.concat(verbs);
}
