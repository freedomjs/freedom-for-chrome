describe('Storage_chrome', function() {
  var storage, dispatch;
  beforeEach(function() {
    dispatch = jasmine.createSpy('dispatchEvent');
    storage = new Storage_chrome(undefined, dispatch);
  });

  it('Persists Data', function(done) {
    var val = Math.random();
    storage.set('myKey', val, function() {
      storage.get('myKey', function(res) {
        expect(res).toBe(val);
        done();
      });
    });
  });
});