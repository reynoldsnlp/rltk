import Particles from './Particles';

export default (selections, targets, language) => {
  switch (targets) {
  case 'particles': return Particles(selections, language);
  default:
    console.log(`Unknown special target for ${targets}`);
    return [];
  }
};
