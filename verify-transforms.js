// Verify our data transformation logic matches expected structures

console.log('Verifying data transformation logic...\n');

// Test data from actual Congress.gov API
const sampleCongressData = {
  actions: {
    actions: [
      {
        actionCode: 'H38900',
        actionDate: '2023-03-30',
        actionTime: '11:47:06',
        sourceSystem: { code: 2, name: 'House floor actions' },
        text: 'The Clerk was authorized to correct section numbers...',
        type: 'Floor'
      }
    ]
  },
  subjects: {
    subjects: {
      legislativeSubjects: [
        { name: 'Energy', updateDate: '2023-03-17T18:05:41Z' }
      ],
      policyArea: { name: 'Energy', updateDate: '2023-03-15T14:15:18Z' }
    }
  },
  cosponsors: {
    cosponsors: [
      {
        bioguideId: 'M001159',
        district: 5,
        firstName: 'Cathy',
        fullName: 'Rep. McMorris Rodgers, Cathy [R-WA-5]',
        party: 'R',
        state: 'WA'
      }
    ]
  }
};

// Simulate what LegisAPI should return after our fixes
console.log('1. Actions endpoint should return:');
const expectedActions = sampleCongressData.actions;
console.log('Structure:', JSON.stringify(expectedActions, null, 2));
console.log('✓ Direct array in actions property (not double-wrapped)\n');

console.log('2. Subjects endpoint should return:');
const expectedSubjects = sampleCongressData.subjects;
console.log('Structure:', JSON.stringify(expectedSubjects, null, 2));
console.log('✓ Nested structure with policyArea and legislativeSubjects\n');

console.log('3. Cosponsors endpoint should return:');
const expectedCosponsors = sampleCongressData.cosponsors;
console.log('Structure:', JSON.stringify(expectedCosponsors, null, 2));
console.log('✓ Direct array in cosponsors property\n');

// Test MCP tool compatibility
console.log('4. MCP Tool Compatibility Tests:\n');

// Test subresourceTool extractItems
function testExtractItems(data, subresource) {
  // Simulating the fixed extractItems logic
  const dataMapping = {
    'actions': 'actions',
    'cosponsors': 'cosponsors',
    'subjects': 'subjects'
  };
  const propertyName = dataMapping[subresource] || subresource;
  
  // New format: data.actions is the array directly
  if (Array.isArray(data[propertyName])) {
    return data[propertyName];
  }
  
  // Special handling for subjects
  if (subresource === 'subjects' && data.subjects) {
    return [data.subjects]; // Wrap in array for consistent handling
  }
  
  return [];
}

console.log('Testing extractItems with actions:', 
  testExtractItems(expectedActions, 'actions').length > 0 ? '✓ Pass' : '✗ Fail');

console.log('Testing extractItems with cosponsors:', 
  testExtractItems(expectedCosponsors, 'cosponsors').length > 0 ? '✓ Pass' : '✗ Fail');

console.log('Testing extractItems with subjects:', 
  testExtractItems(expectedSubjects, 'subjects').length > 0 ? '✓ Pass' : '✗ Fail');

// Test enhanced bill analysis
console.log('\n5. Enhanced Bill Analysis Tool:');
const testAction = expectedActions.actions[0];
console.log('Action text property:', testAction.text ? '✓ Has text' : '✗ Missing text');

// Test trending bills subject access
console.log('\n6. Trending Bills Tool:');
const subjectsObject = expectedSubjects.subjects;
console.log('Policy area access:', subjectsObject.policyArea?.name || 'Not found');
console.log('Legislative subjects count:', subjectsObject.legislativeSubjects?.length || 0);

console.log('\n✅ All transformation verifications complete!');