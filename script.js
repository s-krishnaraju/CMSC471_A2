

function scaleSize(value, maxValue) {
    return 4 + 25 * Math.pow(value / maxValue, 0.3);
}

function formatPassengers(value) {
    if (value >= 1000000) {
        return (value / 1_000_000).toFixed(1) + 'M';
    } else if (value >= 1000) {
        return (value / 1000).toFixed(1) + 'K';
    }
    return value;
}

let layout = {
    title: {
        text: 'Passenger Traffic By Airport',
        font: { size: 35 }
    },
    width: 1000,
    height: 650,
    margin: {
        l: 10,
        r: 10,
        t: 50,
        b: 10
    },
    geo: {
        scope: 'usa',
        projection: {
            type: 'albers usa'
        },

        showland: true,
        landcolor: 'rgb(250,250,250)',
        subunitcolor: 'rgb(217,217,217)',
        countrycolor: 'rgb(217,217,217)',
        countrywidth: 1,
        subunitwidth: 0.5,
    }
};

const config = {
    responsive: true,
    showLink: false
};

let pieLayout = {
    title: {
        text: 'Passenger Distribution by Airport',
        font: { size: 35 }
    },
    height: 600,
    width: 850,
    showlegend: true,
    legend: {
        orientation: 'v',
        xanchor: 'left',
        x: 1.05,
        y: 0.5
    }
};

let colorScale = [
    [0, 'rgb(0, 0, 100)'],
    [0.3, 'rgb(0, 20, 210)'],
    [0.99, 'rgb(0, 100, 255)'],
    [1, 'rgb(244, 245, 249)']
];

let topAirportColors = {
    0: 'rgb(204, 51, 163)',
    1: 'rgb(168, 79, 57)',
    2: 'rgb(255, 153, 0)',
    3: 'rgb(16, 150, 24)',
    4: 'rgb(137, 10, 221)',
    5: 'rgb(49, 247, 0)',
    6: 'rgb(221, 68, 119)',
    7: 'rgb(8, 228, 206)',
    8: 'rgb(255, 0, 0)',
    9: 'rgb(156, 215, 5)',
};

const getAirportColors = () =>
    Object.keys(topAirportColors).map(i => topAirportColors[i])

function updatePieChart(airports) {
    const airportNames = airports.map(row => row.Airport);
    const passengerCounts = airports.map(row => parseFloat(row.Passengers));

    const sortedIndices = passengerCounts
        .map((count, idx) => ({ count, idx }))
        .sort((a, b) => b.count - a.count);

    console.log(sortedIndices)

    const topAirports = sortedIndices.slice(0, 10);

    const otherPassengers = sortedIndices
        .slice(10)
        .reduce((sum, item) => sum + passengerCounts[item.idx], 0);


    const pieLabels = topAirports.map(item => airportNames[item.idx]);
    const pieValues = topAirports.map(item => passengerCounts[item.idx]);

    if (otherPassengers > 0) {
        pieLabels.push("Other Airports");
        pieValues.push(otherPassengers);
    }


    const totalPassengers = passengerCounts.reduce((sum, count) => sum + count, 0);

    const hoverText = pieValues.map(value =>
        `${(value / totalPassengers * 100).toFixed(1)}% (${formatPassengers(value)})`
    );

    // Create the pie chart data
    const pieData = [{
        type: 'pie',
        labels: pieLabels,
        values: pieValues,
        hoverinfo: 'label+text',
        text: hoverText,
        textinfo: 'percent',
        textposition: 'inside',
        insidetextfont: {
            color: 'white',
            size: 14
        },
        marker: {
            colors: [...getAirportColors(), 'rgb(0, 100, 255)'],
            line: {
                color: 'white',
                width: 2
            }
        },
        hole: 0.4,
        pull: 0.03,
        rotation: 90
    }];

    Plotly.react("myPieChart", pieData, pieLayout, config);
}




d3.csv('./US_airport_data.csv', function (err, rows) {
    if (err) {
        console.error("Error loading data:", err);
        return;
    }

    let passengers = rows.map(airport => airport.Passengers);
    let maxPassengers = Math.max(...passengers);
    let minPassengers = Math.min(...passengers);

    let currentMinFilter = minPassengers;
    let currentMaxFilter = maxPassengers;


    setUpRangeSlider()
    // Plot the scatter map
    Plotly.newPlot("myDiv", [getPlotData()], layout, config);
    // Plot the pie chart
    Plotly.newPlot('myPieChart', {}, pieLayout, config);
    updatePieChart(getFilteredAirports());

    function getFilteredAirports() {
        const filteredAirports = [];
        const sortedAirportIndices = passengers
            .map((count, idx) => ({ count, idx }))
            .sort((a, b) => b.count - a.count);


        for (i of sortedAirportIndices) {
            if (passengers[i.idx] >= currentMinFilter && passengers[i.idx] <= currentMaxFilter) {
                filteredAirports.push(rows[i.idx]);
            }
        }
        return filteredAirports;
    }

    function updatePlot() {
        Plotly.react("myDiv", [getPlotData()], layout, config);
        updatePieChart(getFilteredAirports());
    };

    function getPlotData() {
        const data = getFilteredAirports();
        return {
            type: 'scattergeo',
            locationmode: 'USA-states',
            lon: data.map(airport => parseFloat(airport.Longitude)),
            lat: data.map(airport => parseFloat(airport.Latitude)),
            hoverinfo: 'text',
            text: data.map(airport => `<i><b>${airport.Airport}</i></b><br>Passengers Enplaned: ${formatPassengers(airport.Passengers)}<br>State: ${airport.State}<br>City: ${airport.City}`),
            mode: 'markers',
            marker: {
                size: data.map(airport => scaleSize(airport.Passengers, maxPassengers)),
                opacity: 0.8,
                reversescale: true,
                autocolorscale: false,
                symbol: 'circle',
                line: {
                    width: 1,
                    color: 'rgb(102, 102, 102)',
                },
                colorscale: colorScale,
                cmin: currentMinFilter,
                cmax: currentMaxFilter,
                color: [...getAirportColors(), ...data.slice(10).map(airport => airport.Passengers)],
                colorbar: {
                    title: { text: 'Passengers Enplaned' },
                    thickness: 20,
                    len: 0.9,
                    titlefont: { size: 14 }
                }
            }
        }
    }


    function setUpRangeSlider() {
        const minLabel = document.getElementById('minLabel');
        minLabel.textContent = formatPassengers(minPassengers);

        const maxLabel = document.getElementById('maxLabel');
        maxLabel.textContent = formatPassengers(maxPassengers);

        const slider = document.getElementById("rangeSlider");

        noUiSlider.create(slider, {
            start: [minPassengers, maxPassengers],
            connect: true,
            range: {
                'min': minPassengers,
                'max': maxPassengers
            },
            step: 1000
        });

        slider.noUiSlider.on('update', function (values, handle) {
            currentMinFilter = parseFloat(values[0]);
            currentMaxFilter = parseFloat(values[1]);
            minLabel.textContent = formatPassengers(currentMinFilter);
            maxLabel.textContent = formatPassengers(currentMaxFilter);
            updatePlot();
        });
    }



});