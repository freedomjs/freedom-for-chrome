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

  it('Implements the full Storage API', function(done) {
    storage.set('myKey', 'val1',
      storage.set.bind(storage, 'Key2', 'val2',
        storage.keys.bind(storage, function(keys) {
          expect(keys.length).toBe(2);
          storage.clear(storage.keys.bind(storage, function(keys) {
            expect(keys.length).toBe(0);
            done();
          }));
        })));
  });
});