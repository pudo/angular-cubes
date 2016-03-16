import { Api } from '../../api/index'
import c3 from 'c3'
import * as Utils from '../utils.js'
import _ from 'lodash'
import events from 'events'
var api = new Api();

export class PieChartComponent extends events.EventEmitter {

  constructor() {
    super();
    this.wrapper = null;
    this.chart = null;
  }

  refresh() {
    var bounds = this.wrapper.getBoundingClientRect();
    //this.chart.resize({
    //  height: bounds.height,
    //  width: bounds.width
    //});
  }

  build(endpoint, cube, params, wrapper, colorSchema) {
    params = _.cloneDeep(params);

    var that = this;
    this.wrapper = wrapper;

    this.emit('beginAggregate', this);

    var size = {
      width: this.wrapper.clientWidth,
      height: this.wrapper.clientWidth * 0.6
    };

    d3.select(this.wrapper)
      .style('width', size.width + 'px')
      .style('height', size.height + 'px');

    api.aggregate(endpoint, cube, params).then((data) => {

      that.chart = c3.generate({
        bindto: that.wrapper,
        data: {
          names: Utils.buildC3Names(data),
          columns: Utils.buildC3Columns(data, params.aggregates),
          colors: Utils.buildC3Colors(data, colorSchema),
          type: 'pie',
          onclick: (d, element) => {
            that.emit('click', that, d);
          }
        }
      });

      this.emit('endAggregate', that, data);
    });
  }
}

export default PieChartComponent