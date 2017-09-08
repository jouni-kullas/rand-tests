var n = 4000;//size of random real numbers to be created. Math.random() creates IEEE standard floats between 1 and 0 inclusive
var n_i = []; //array of random values. 
var b_i = []; // random bits from random float values. Size of this array is dependent on the bit accuracy of the target browser
var boe = 32; //bits of entropy per random number. Dependent on browser. Chrome 32, others 53?
var b_i_length = 0;
var n_i_lenght = 0;
var bitDiscrepencies = []; //array of bit descrepancies
var alpha = 0.01; //error marginal
var testLoop = 100;//number of testloops to run when test uses Math.random().


function countSetBits(i) {
     i = i - ((i >> 1) & 0x55555555);
     i = (i & 0x33333333) + ((i >> 2) & 0x33333333);
     return (((i + (i >> 4)) & 0x0F0F0F0F) * 0x01010101) >> 24;
}

var readInput = function() {
	n_i = []; //empty array
	if ($('#random_input').val()) {
		boe = 53; //assume 53 bits of entropy for now...
		var input = $('#random_input').val();
		var rows = input.split(/\n/g);
		for(var index in rows) {
			rand = parseFloat(rows[index]);
			if (rand != 'NaN') {
				n_i.push(rand);
			}
		}
		n = n_i.length;
		console.log(n_i);
	}	
}

var constructRandom = function() {
	//convert random numbers to random bits. 
	b_i_length = Math.floor(n*boe / 32); //number of full 32 bit words extractable from the random floats
	b_i = new Uint32Array(b_i_length); // 32bit unsigned ints to hold the bit presentation of the random floats
	var i = 0; //index of the floating point random numbers
	var j = 0; //index of the random bits array

	var n_i_index = 0; //index of current random number. 
	n_i_length = n; //size of the float array. 
	var n_i_bit = 0; //index of current bit in the current random number
	var n_i_elem = Math.floor(n_i[n_i_index] * Math.pow(2,boe)); //current random number converted to integer

	var getNextBit = function() {
		bit = n_i_elem % 2;
		n_i_elem = Math.floor(n_i_elem / 2);
		n_i_bit += 1;
		if (n_i_bit == boe) { //if all entropy has been moved from this random number, move to the next.
			n_i_index += 1;
			n_i_bit = 0;
			n_i_elem = Math.floor(n_i[n_i_index] * Math.pow(2,boe));
		}

		return bit;
	}

	b_i_counter = 0;
	bit_counter = 0;
	while (b_i_counter < b_i_length) {
		binary = '';
		for(a=0; a<32;a++ ) {
			b_i[b_i_counter] = b_i[b_i_counter] << 1;
			bit = getNextBit();
			b_i[b_i_counter] += bit;
			binary += bit;
		}
		// console.log(binary + ' ' + countSetBits(b_i[b_i_counter]));
		b_i_counter++; 
	} 

	console.log('random numbers extracted');
}

var createRandom = function() {
	//create n random numbers
	boe = 32; //TODO: NEED TO DETECT THIS!
	n_i = [];
	for (i=0; i < n; i++) {
		n_i.push(Math.random());
	}

}

var pearsonsChiSquare = function(dof, chi) {
	return (1 - jStat.lowRegGamma(dof/2,chi/2));
}

var runTests = function() {
	/************************** Test section **************************************
	******************************************************************************/

	/*
		First test is the frequency test of bits for math.random(). Test calculates the sum of 1 bits in the sequence of nb bits and compares it to the expected value.
	*/
	var noOnes = 0;
	for(a=0; a<b_i_length; a++) {
		noOnes += (countSetBits(b_i[a]) - (32 - countSetBits(b_i[a]))); // 0=-1, 1=1  
	}

	var percentile = jStat.erfc( (Math.abs(noOnes) / Math.sqrt(b_i_length*32)) / Math.sqrt(2) );
	var error = '';
	if (percentile < alpha) error = ' class="error"';
	$('#bit_frequency').prepend('<p' + error + '>Bit frequency test: ' + percentile + ' : ' + noOnes + '/' + b_i_length*32 + '</p>');

	bitDiscrepencies.push(percentile);
	bitDiscrepencies.sort( function(a,b) {return a-b;});	

	if (bitDiscrepencies.length > 99) {
			var labels = [];
			var plottedData = [];
			var start = bitDiscrepencies[0];
			var end = bitDiscrepencies[bitDiscrepencies.length - 1];
			var counter = 0;
			var plotInterval = 0.01; 

			var plotSize = 1/plotInterval;
			var plotCursor = 0;
			var	sumCounter = 0;
			var index = 0;
			for(var i=0; i < plotSize; i++)  {
				plotCursor += plotInterval;
				sumCounter = 0;
				while(bitDiscrepencies[index] < plotCursor) {
					index += 1;
					sumCounter += 1;
				}
				labels.push(plotCursor.toFixed(2));
				plottedData.push(sumCounter);
			} 
			var data = {
				    labels: labels,
				    datasets: [
				        {
				            label: "Frequencies of bit discrepancies.",
				            fillColor: "rgba(220,220,220,0.2)",
				            strokeColor: "rgba(220,220,220,1)",
				            pointColor: "rgba(220,220,220,1)",
				            pointStrokeColor: "#fff",
				            pointHighlightFill: "#fff",
				            pointHighlightStroke: "rgba(220,220,220,1)",
				            data: plottedData
				        }
				    ]
				};

			var ctx = document.getElementById("plot_frequency").getContext("2d");
			var plotSubstringFreq = new Chart(ctx).Line(data);



	}


	console.log('Bit frequency test: ' + percentile);
	console.log('Bit frequency noOnes: ' + noOnes + ' of ' + b_i_length*32);


	/*
		Frequency test for floats
	*/
	var freq = [];
	var dof = 256; //Degrees Of Freedom. Testing the upper 8 bits of the float value.
	for(a=0; a<dof; a++) {
		freq[a] = 0;
	}
	for(a=0; a<n_i_length; a++) {
		var index = Math.floor(n_i[a]*dof);
		if (index < 0 || index >= dof) console.log('ERROR scaling float in frequency test (upper 8bits)');
		freq[index] += 1;
	}

	var chi = 0;
	for(a=0; a<dof; a++) {		
		chi += Math.pow(freq[a] - (n_i_length/dof),2) / (n_i_length/dof);
	}

	var percentile = pearsonsChiSquare(dof,chi);
	console.log('frequency, upper 8bits')
	console.log(dof + ' = dof .... chi = ' + chi)
	console.log(freq);
	console.log(freq.size)
	console.log('expected per bucket: ' + (n_i_length / dof));
	console.log(chi)
	var error = '';
	if (percentile < alpha) error = ' class="error"';
	$('#frequency').prepend('<p' + error + '>Float : ' + percentile + '</p>');

	console.log('float frequency (upper 8 bits): ' + percentile );



	/*
		Frequency test for floats, lower 8 bits
	*/
	var freq = [];
	var bits = 8; //Testing the lower 8 bits of the float value.
	for(a=0; a<Math.pow(2,bits); a++) {
		freq[a] = 0;
	}
	for(a=0; a<n_i_length; a++) {
		var index = Math.floor((n_i[a] * Math.pow(2,boe)) % Math.pow(2,bits));
		freq[index] += 1;
	}

	var chi = 0;
	for(a=0; a<dof; a++) {
		chi += Math.pow(freq[a] - (n_i_length/dof),2) / (n_i_length/dof);
	}

	var percentile = pearsonsChiSquare(dof,chi);
	console.log('frequency, lower 8bits')
	console.log(dof + ' = dof .... chi = ' + chi)
	/*console.log(freq);
	console.log(freq.size) 
	console.log('expected per bucket: ' + (n_i_length / dof)); */
	console.log(chi);
	var error = '';
	if (percentile < alpha) error = ' class="error"';
	$('#frequency_lower8bits').prepend('<p' + error + '>Float : ' + percentile + '</p>');

	console.log('float frequency (lower 8bits): ' + (pearsonsChiSquare(dof, chi)) );
 



	/*
		testing groups of 64 bits and chi squaring the results
	*/

	var results = new Array(64);
	//initialize results array with zeros
	for(a=0; a<64; a++) {
		results[a] = 0;
	}
	for(a=0; a< (b_i_length / 2); a++) {
		noOnes = countSetBits(b_i[2*a]) + countSetBits(b_i[2*a + 1]);
		results[noOnes] += 1;
	}

	var chi = 0;
	var sum = 0;
	var plot = [];
	var labels = [];
	var expected = [];
	var values = [];
	for(a=0; a<64; a++) {
		expected.push((b_i_length / 2) * (Math.pow(1/2,64) * jStat.combination(64,a)) );
		//console.log(results[a] + ' / ' + expected);
		//chi += Math.pow((results[a] - expected),2) / expected ;
		sum += results[a];
		//plot[a] = sum / (b_i_length/2);
		//labels[a] = Math.round(a*100 / 63) + '%'; 
	}

	//we need to combine the values with expected frequencies below 5.
	//here is assumed that the start is increasing and the end is decreasing in probability
	var cumulativeExpectancy = 0;
	var value = 0;
	var valuesCombined = [];
	var expectedCombined = [];

	for(a in expected) {
		cumulativeExpectancy += expected[a];
		value += results[a];
		if (cumulativeExpectancy >= 5 ) {
			valuesCombined.push(value);
			expectedCombined.push(cumulativeExpectancy);
			cumulativeExpectancy = 0;
			value = 0;
		}
	}
	//add the possible last values to the last "over 5 elements" part
	if(cumulativeExpectancy < 5) {
		valuesCombined[valuesCombined.length - 1] += value;
		expectedCombined[expectedCombined.length - 1] += cumulativeExpectancy;
	} 
	//calculate chi
	var chi = 0; 
	for(a in valuesCombined) {
		chi += ( Math.pow((valuesCombined[a] - expectedCombined[a]),2) / expectedCombined[a]);
		//plot.push(Math.pow((valuesCombined[a] - expectedCombined[a]),2) / expectedCombined[a]);
		plot.push(valuesCombined[a]);
		labels.push(a);
	}

	for(a in valuesCombined) {
		console.log(valuesCombined[a] + ' - ' + expectedCombined[a] + ' = ' + (((valuesCombined[a] - expectedCombined[a]),2) / expectedCombined[a]));
	}
	console.log('chi = ' + chi + ' dof = ' + (valuesCombined.length -1));

	if (testLoop == 1) {
		var data = {
		    labels: labels,
		    datasets: [
		        {
		            label: "Substring frequencies of Hamming weights.",
		            fillColor: "rgba(220,220,220,0.2)",
		            strokeColor: "rgba(220,220,220,1)",
		            pointColor: "rgba(220,220,220,1)",
		            pointStrokeColor: "#fff",
		            pointHighlightFill: "#fff",
		            pointHighlightStroke: "rgba(220,220,220,1)",
		            data: plot
		        }
		        /*,{
		            label: "My Second dataset",
		            fillColor: "rgba(151,187,205,0.2)",
		            strokeColor: "rgba(151,187,205,1)",
		            pointColor: "rgba(151,187,205,1)",
		            pointStrokeColor: "#fff",
		            pointHighlightFill: "#fff",
		            pointHighlightStroke: "rgba(151,187,205,1)",
		            data: [28, 48, 40, 19, 86, 27, 90]
		        }*/
		    ]
		};
		
		var ctx = document.getElementById("plot_substring_freq").getContext("2d");
		var plotSubstringFreq = new Chart(ctx).Line(data);
		console.log(chi);
	}

	var percentile = pearsonsChiSquare(valuesCombined.length - 1,chi);
	var error = '';
	if (percentile < alpha) error = ' class="error"';
	$('#substring_bitfrequency').prepend('<p' + error + '>Float : ' + percentile + '</p>');
	console.log( percentile );

	/*
		orders test
	*/	



}


$(function() {

	$('#commit_values').click( function() {
		readInput();
		constructRandom(); 
		runTests();
	} );


	$('#random_floats').click( function() {
		while (testLoop) {
			createRandom();
			constructRandom();
			runTests();
			//force redraw on tests
			var data = document.getElementById('tests').offsetHeight;
			testLoop--;
		}
		testLoop = 20;
	});



	/*
		Orderings test with k=5
	*/



})