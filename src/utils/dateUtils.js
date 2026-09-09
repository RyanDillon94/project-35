export function getCurrentDate() {
  const testDate = localStorage.getItem('p35_test_date');
  return testDate ? new Date(testDate) : new Date();
}

export function getCurrentDateString() {
  const d = getCurrentDate();
  return d.toISOString().split('T')[0];
}
