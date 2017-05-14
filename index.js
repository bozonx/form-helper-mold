import _ from 'lodash';


class Plugin {
  constructor(form, molds) {
    this.form = form;
    this.molds = null;

    if (_.isArray(molds)) {
      this.molds = molds;
    }
    else if (_.isObject(molds)) {
      this.molds = [molds];
    }
    else {
      throw new Error(`Incorrect "molds" type. Allow only array or plain object`);
    }

    this._registerListeners();
    this._registerMethods();

    // save after debounced event
    this.form.onSave(() => this.saveMold());
  }

  saveMold() {
    // TODO: сохранять только выбранные поля
    return Promise.all(_.map(this.molds, (mold) => mold.patch()));
  }

  loadMold() {
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


  getMoldFieldNames() {
    let names = [];

    _.each(this.molds, (item) => {
      if (item.type !== 'document' && item.type !== 'container') throw new Error(`Only document or container mold type are supported!`);
      names = names.concat(_.keys(item.schema.schema));
    });

    return _.uniq(names);
  }


  _registerMethods() {
    this.form.saveMold = () => this.saveMold();
    this.form.loadMold = () => this.loadMold();
    this.form.getMoldFieldNames = () => this.getMoldFieldNames();
  }


  _registerListeners() {
    // TODO: сделать поддержку более одного mold

    _.each(this.molds, (mold) => {
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

}

export default {
  afterNewFormCreated(form) {
    const molds = form.getConfig().molds;
    if (_.isEmpty(molds)) return;
    new Plugin(form, molds);
  }
}
