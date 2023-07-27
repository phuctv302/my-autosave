class ArrayUtils {
	//

	static filterUniqueByKey(arr, key = 'id') {
		return [...new Map(arr.map((item) => [item[key], item])).values()];
	}
}

module.exports = ArrayUtils;
