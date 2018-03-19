const mainKeys = {
  AC: 'accession',
  AU: 'author',
  DE: 'name',
  TP: 'type',
  TH: 'threshold',
};
const refKeys = {
  RM:	'PMID',
  RT:	'title',
  RA:	'author',
  RL:	'citation',
}
const stepKeys = {
  ID:	'id',
  DN:	'name',
  RQ:	'requires',
}
const parseGenProp = (txt) => {
  const property = {
    references: [],
    databases: [],
    steps: [],
    description: '',
    notes: '',
  };
  let currentRef = null;
  let currentDB = null;
  let currentStep = null;
  let currentEV = null;
  txt.split('\n').forEach(line=>{
    const key = line.substr(0,2);
    const value = line.substr(3).trim();
    if (key in mainKeys) property[mainKeys[key]] = value;

    // References
    if (key === 'RN') {
      currentRef = {
        number: Number(value.replace('[','').replace(']','')),
        title: '',
      }
      property.references.push(currentRef);
    }
    if (key in refKeys && currentRef) {
      if (key === 'RT') {
        currentRef.title += value;
      } else {
        currentRef[refKeys[key]] = value;
      }
    }
    // Databases
    if (key === 'DC') {
      if (currentDB){
        currentDB.title += ' '+value;
      } else {
        currentDB = {title: value}
        property.databases.push(currentDB);
      }
    }
    if (key === 'DR' && currentDB) {
      currentDB['link'] = value;
      currentDB =null;
    }
    // Description
    if (key === 'CC') property.description += value + ' ';

    // Notes
    if (key === '**') property.notes += value + ' ';

    // Steps
    if (key === 'SN') {
      currentStep = {
        number: Number(value),
        evidence_list: [],
      }
      property.steps.push(currentStep);
    }
    if (key in stepKeys && currentStep) currentStep[stepKeys[key]] = value;
    // Evidence
    if (key === 'EV' && currentStep) {
      currentEV = {evidence: value}
      currentStep.evidence_list.push(currentEV);
    }
    if (key === 'TG' && currentStep && currentEV) currentEV['go'] = value;

  });
  return property;
  // console.log(property);
  // return `<pre>${JSON.stringify(property, null, '  ')}</pre>`;
};


export default parseGenProp;
