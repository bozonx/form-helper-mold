import _ from 'lodash';


class FormHelperMold {
  constructor(formFactory, molds, formFieldsList) {
    if (formFieldsList && !_.isArray(formFieldsList)) throw new Error(`Incorrect type of "formFieldsList" param`);

    this.molds = null;

    if (_.isArray(molds)) {
      this.molds = molds;
    }
    else if (_.isObject(molds)) {
      this.molds = [molds];
    }
    else {
      throw new Error(`Incorrect "molds" type. Allow array or plain object`);
    }

    this.fieldNames = formFieldsList || this._getMoldsFieldNames(this.molds);

    this.form = formFactory();
    this.form.init(this.fieldNames);

    this._registerListeners();

    // save after debounced event
    this.form.onSave(() => this.save());

    // TODO: сделать по другому
    this.on = (...a) => this.form.on(...a);
    this.fields = this.form.fields;
    this.$getWholeStorageState = (...a) => this.form.$getWholeStorageState(...a);
  }

  save() {
    // TODO: сохранять только выбранные поля
    return Promise.all(_.map(this.molds, (mold) => mold.patch()));
  }

  load() {
    return Promise.all(_.map(this.molds, (mold) => {
      return mold.load().then(() => {
        this.form.values = mold.mold;
      }, (err) => {
        // put data for first time
        if (err.driverError.status == 404) {
          return mold.put();
        }
      });
    }));
  }

  _registerListeners() {
    // TODO: сделать поддержку более одного mold

    _.each(this.molds, (mold) => {
      // TODO: переместить в react-mold-form
      // update mold immediately
      this.form.onChange((newFormState) => {
        mold.update(newFormState, {formUpdate: true});
      });

      // TODO: проверить что происходит дестрой все обработчиков при unmount
      mold.onAnyChangeDeep((data) => {
        // skip event from form update
        if (data.data && data.data.formUpdate) return;
        // TODO: если несклько mold то будет затераться значения
        this.form.values = mold.mold;
      });
    });
  }

  _getMoldsFieldNames(molds) {
    let names = [];

    _.each(molds, (item) => {
      if (item.type !== 'document' && item.type !== 'container') throw new Error(`Only document or container mold type are supported!`);
      names = names.concat(_.keys(item.schema.schema));
    });

    return _.uniq(names);
  }

}

export default function(...params) {
  return new FormHelperMold(...params);
}
