extends Node
var thread_promises = []

func _process(_delta):
	# Check for completed promises and remove them
	var dead = []
	for obj in thread_promises:
		if !is_instance_valid(obj):
			dead.append(obj)
		elif !obj.thread.is_alive():
			if !obj.is_settled:
				# Handle promises that died due to runtime errors
				obj.do_reject()
			dead.append(obj)
	for obj in dead:
		self.thread_promises.erase(obj)

class PromiseObject:
	extends Object
	signal resolve(result: Variant)
	signal reject(err: Variant)
	signal settled()
	var is_settled := false
	var is_rejected := false

class ThreadPromiseObject:
	extends PromiseObject
	var thread: Thread
	
	func _init(f: Callable):
		self.thread = Thread.new()
		self.thread.start(func():
			f.call(self.do_reject)
			# Set to true if the thread finished executing and did not terminate prematurely due to a runtime error			
			self.is_settled = true
			if !self.is_rejected:
				self.do_resolve()
		)
	
	func do_reject(err = null):
		self.is_rejected = true
		self.is_settled = true
		(func():
			self.thread.wait_to_finish()
			self.reject.emit(err)
			self.settled.emit()
			Util.free_object(self)
		).call_deferred()
		
	func do_resolve(result = null):
		(func():
			self.thread.wait_to_finish()
			self.resolve.emit(result)
			self.settled.emit()
			Util.free_object(self)
		).call_deferred()

## Create a promise from a function to run on a background thread
func from(f: Callable) -> Signal:
	var obj := ThreadPromiseObject.new(f)
	thread_promises.push_back(obj)
	return obj.resolve

func finally(promise_resolve: Signal, finally: Callable) -> Signal:
	var promise_reject = Signal(promise_resolve.get_object(), "reject")
	promise_resolve.connect(finally.unbind(1))
	promise_reject.connect(finally)
	return promise_resolve
func catch(promise_resolve: Signal, catch = null, finally = null) -> Signal:
	if catch:
		var promise_reject = Signal(promise_resolve.get_object(), "reject")
		promise_reject.connect(catch)
	if finally:
		Util.finally(promise_resolve, finally)
	return promise_resolve
func try(promise_resolve: Signal, try = null, catch = null):
	var promise_settled = Signal(promise_resolve.get_object(), "settled")
	if try:
		promise_resolve.connect(try)
	if catch:
		var promise_reject = Signal(promise_resolve.get_object(), "reject")
		promise_reject.connect(catch)
	return promise_settled
func settled(promise_resolve: Signal) -> Signal:
	var promise_settled = Signal(promise_resolve.get_object(), "settled")
	return promise_settled
